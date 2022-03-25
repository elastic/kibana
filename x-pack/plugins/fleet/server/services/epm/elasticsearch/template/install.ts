/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, cloneDeep } from 'lodash';
import Boom from '@hapi/boom';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from 'src/core/server';

import { ElasticsearchAssetType } from '../../../../types';
import type {
  RegistryDataStream,
  IndexTemplateEntry,
  RegistryElasticsearch,
  InstallablePackage,
  IndexTemplate,
  PackageInfo,
  IndexTemplateMappings,
  TemplateMapEntry,
  TemplateMap,
} from '../../../../types';

import { loadFieldsFromYaml, processFields } from '../../fields/field';
import type { Field } from '../../fields/field';
import { getPipelineNameForInstallation } from '../ingest_pipeline/install';
import { getAsset, getPathParts } from '../../archive';
import { removeAssetTypesFromInstalledEs, saveInstalledEsRefs } from '../../packages/install';
import {
  FLEET_COMPONENT_TEMPLATES,
  MAPPINGS_TEMPLATE_SUFFIX,
  SETTINGS_TEMPLATE_SUFFIX,
  USER_SETTINGS_TEMPLATE_SUFFIX,
} from '../../../../constants';

import { getESAssetMetadata } from '../meta';
import { retryTransientEsErrors } from '../retry';

import { getPackageInfo } from '../../packages';

import {
  generateMappings,
  generateTemplateName,
  generateTemplateIndexPattern,
  getTemplate,
  getTemplatePriority,
} from './template';
import { buildDefaultSettings } from './default_settings';

const FLEET_COMPONENT_TEMPLATE_NAMES = FLEET_COMPONENT_TEMPLATES.map((tmpl) => tmpl.name);

export const installTemplates = async (
  installablePackage: InstallablePackage,
  esClient: ElasticsearchClient,
  logger: Logger,
  paths: string[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<IndexTemplateEntry[]> => {
  // install any pre-built index template assets,
  // atm, this is only the base package's global index templates
  // Install component templates first, as they are used by the index templates
  await installPreBuiltComponentTemplates(paths, esClient, logger);
  await installPreBuiltTemplates(paths, esClient, logger);

  // remove package installation's references to index templates
  await removeAssetTypesFromInstalledEs(savedObjectsClient, installablePackage.name, [
    ElasticsearchAssetType.indexTemplate,
    ElasticsearchAssetType.componentTemplate,
  ]);
  // build templates per data stream from yml files
  const dataStreams = installablePackage.data_streams;
  if (!dataStreams) return [];

  const packageInfo = await getPackageInfo({
    savedObjectsClient,
    pkgName: installablePackage.name,
    pkgVersion: installablePackage.version,
  });

  const installedTemplatesNested = await Promise.all(
    dataStreams.map((dataStream) =>
      installTemplateForDataStream({
        pkg: packageInfo,
        esClient,
        logger,
        dataStream,
      })
    )
  );
  const installedTemplates = installedTemplatesNested.flat();

  // get template refs to save
  const installedIndexTemplateRefs = getAllTemplateRefs(installedTemplates);

  // add package installation's references to index templates
  await saveInstalledEsRefs(
    savedObjectsClient,
    installablePackage.name,
    installedIndexTemplateRefs
  );

  return installedTemplates;
};

const installPreBuiltTemplates = async (
  paths: string[],
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  const templatePaths = paths.filter((path) => isTemplate(path));
  const templateInstallPromises = templatePaths.map(async (path) => {
    const { file } = getPathParts(path);
    const templateName = file.substr(0, file.lastIndexOf('.'));
    const content = JSON.parse(getAsset(path).toString('utf8'));

    const esClientParams = { name: templateName, body: content };
    const esClientRequestOptions = { ignore: [404] };

    if (content.hasOwnProperty('template') || content.hasOwnProperty('composed_of')) {
      // Template is v2
      return retryTransientEsErrors(
        () => esClient.indices.putIndexTemplate(esClientParams, esClientRequestOptions),
        { logger }
      );
    } else {
      // template is V1
      return retryTransientEsErrors(
        () => esClient.indices.putTemplate(esClientParams, esClientRequestOptions),
        { logger }
      );
    }
  });
  try {
    return await Promise.all(templateInstallPromises);
  } catch (e) {
    throw new Boom.Boom(`Error installing prebuilt index templates ${e.message}`, {
      statusCode: 400,
    });
  }
};

const installPreBuiltComponentTemplates = async (
  paths: string[],
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  const templatePaths = paths.filter((path) => isComponentTemplate(path));
  const templateInstallPromises = templatePaths.map(async (path) => {
    const { file } = getPathParts(path);
    const templateName = file.substr(0, file.lastIndexOf('.'));
    const content = JSON.parse(getAsset(path).toString('utf8'));

    const esClientParams = {
      name: templateName,
      body: content,
    };

    return retryTransientEsErrors(
      () => esClient.cluster.putComponentTemplate(esClientParams, { ignore: [404] }),
      { logger }
    );
  });

  try {
    return await Promise.all(templateInstallPromises);
  } catch (e) {
    throw new Boom.Boom(`Error installing prebuilt component templates ${e.message}`, {
      statusCode: 400,
    });
  }
};

const isTemplate = (path: string) => {
  const pathParts = getPathParts(path);
  return pathParts.type === ElasticsearchAssetType.indexTemplate;
};

const isComponentTemplate = (path: string) => {
  const pathParts = getPathParts(path);
  return pathParts.type === ElasticsearchAssetType.componentTemplate;
};

/**
 * installTemplateForDataStream installs one template for each data stream
 *
 * The template is currently loaded with the pkgkey-package-data_stream
 */

export async function installTemplateForDataStream({
  pkg,
  esClient,
  logger,
  dataStream,
}: {
  pkg: PackageInfo;
  esClient: ElasticsearchClient;
  logger: Logger;
  dataStream: RegistryDataStream;
}): Promise<IndexTemplateEntry> {
  const fields = await loadFieldsFromYaml(pkg, dataStream.path);
  return installTemplate({
    esClient,
    logger,
    fields,
    dataStream,
    packageVersion: pkg.version,
    packageName: pkg.name,
  });
}

function putComponentTemplate(
  esClient: ElasticsearchClient,
  logger: Logger,
  params: {
    body: TemplateMapEntry;
    name: string;
    create?: boolean;
  }
): {
  clusterPromise: ReturnType<typeof esClient.cluster.putComponentTemplate>;
  name: string;
} {
  const { name, body, create = false } = params;
  return {
    clusterPromise: retryTransientEsErrors(
      () => esClient.cluster.putComponentTemplate({ name, body, create }, { ignore: [404] }),
      { logger }
    ),
    name,
  };
}

type TemplateBaseName = string;
type UserSettingsTemplateName = `${TemplateBaseName}${typeof USER_SETTINGS_TEMPLATE_SUFFIX}`;

const isUserSettingsTemplate = (name: string): name is UserSettingsTemplateName =>
  name.endsWith(USER_SETTINGS_TEMPLATE_SUFFIX);

function buildComponentTemplates(params: {
  mappings: IndexTemplateMappings;
  templateName: string;
  registryElasticsearch: RegistryElasticsearch | undefined;
  packageName: string;
  defaultSettings: IndexTemplate['template']['settings'];
}) {
  const { templateName, registryElasticsearch, packageName, defaultSettings, mappings } = params;
  const mappingsTemplateName = `${templateName}${MAPPINGS_TEMPLATE_SUFFIX}`;
  const settingsTemplateName = `${templateName}${SETTINGS_TEMPLATE_SUFFIX}`;
  const userSettingsTemplateName = `${templateName}${USER_SETTINGS_TEMPLATE_SUFFIX}`;

  const templatesMap: TemplateMap = {};
  const _meta = getESAssetMetadata({ packageName });

  const indexTemplateSettings = registryElasticsearch?.['index_template.settings'] ?? {};
  // @ts-expect-error no property .mapping (yes there is)
  const indexTemplateMappingSettings = indexTemplateSettings?.index?.mapping;
  const indexTemplateSettingsForTemplate = cloneDeep(indexTemplateSettings);

  // index.mapping settings must go on the mapping component template otherwise
  // the template may be rejected e.g if nested_fields.limit has been increased
  if (indexTemplateMappingSettings) {
    // @ts-expect-error no property .mapping
    delete indexTemplateSettingsForTemplate.index.mapping;
  }

  templatesMap[mappingsTemplateName] = {
    template: {
      settings: {
        index: {
          mapping: {
            total_fields: {
              limit: '10000',
            },
            ...indexTemplateMappingSettings,
          },
        },
      },
      mappings: merge(mappings, registryElasticsearch?.['index_template.mappings'] ?? {}),
    },
    _meta,
  };

  templatesMap[settingsTemplateName] = {
    template: {
      settings: merge(defaultSettings, indexTemplateSettingsForTemplate),
    },
    _meta,
  };

  // return empty/stub template
  templatesMap[userSettingsTemplateName] = {
    template: {
      settings: {},
    },
    _meta,
  };

  return templatesMap;
}

async function installDataStreamComponentTemplates(params: {
  mappings: IndexTemplateMappings;
  templateName: string;
  registryElasticsearch: RegistryElasticsearch | undefined;
  esClient: ElasticsearchClient;
  logger: Logger;
  packageName: string;
  defaultSettings: IndexTemplate['template']['settings'];
}) {
  const {
    templateName,
    registryElasticsearch,
    esClient,
    packageName,
    defaultSettings,
    logger,
    mappings,
  } = params;
  const componentTemplates = buildComponentTemplates({
    mappings,
    templateName,
    registryElasticsearch,
    packageName,
    defaultSettings,
  });
  const templateEntries = Object.entries(componentTemplates);
  // TODO: Check return values for errors
  await Promise.all(
    templateEntries.map(async ([name, body]) => {
      if (isUserSettingsTemplate(name)) {
        // look for existing user_settings template
        const result = await retryTransientEsErrors(
          () => esClient.cluster.getComponentTemplate({ name }, { ignore: [404] }),
          { logger }
        );
        const hasUserSettingsTemplate = result.component_templates?.length === 1;
        if (!hasUserSettingsTemplate) {
          // only add if one isn't already present
          const { clusterPromise } = putComponentTemplate(esClient, logger, {
            body,
            name,
          });
          return clusterPromise;
        }
      } else {
        const { clusterPromise } = putComponentTemplate(esClient, logger, { body, name });
        return clusterPromise;
      }
    })
  );

  return { componentTemplateNames: Object.keys(componentTemplates) };
}

export async function ensureDefaultComponentTemplates(
  esClient: ElasticsearchClient,
  logger: Logger
) {
  return Promise.all(
    FLEET_COMPONENT_TEMPLATES.map(({ name, body }) =>
      ensureComponentTemplate(esClient, logger, name, body)
    )
  );
}

export async function ensureComponentTemplate(
  esClient: ElasticsearchClient,
  logger: Logger,
  name: string,
  body: TemplateMapEntry
) {
  const getTemplateRes = await retryTransientEsErrors(
    () =>
      esClient.cluster.getComponentTemplate(
        {
          name,
        },
        {
          ignore: [404],
        }
      ),
    { logger }
  );

  const existingTemplate = getTemplateRes?.component_templates?.[0];
  if (!existingTemplate) {
    await putComponentTemplate(esClient, logger, {
      name,
      body,
    }).clusterPromise;
  }

  return { isCreated: !existingTemplate };
}

export async function installTemplate({
  esClient,
  logger,
  fields,
  dataStream,
  packageVersion,
  packageName,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  fields: Field[];
  dataStream: RegistryDataStream;
  packageVersion: string;
  packageName: string;
}): Promise<IndexTemplateEntry> {
  const validFields = processFields(fields);
  const mappings = generateMappings(validFields);
  const templateName = generateTemplateName(dataStream);
  const templateIndexPattern = generateTemplateIndexPattern(dataStream);
  const templatePriority = getTemplatePriority(dataStream);

  let pipelineName;
  if (dataStream.ingest_pipeline) {
    pipelineName = getPipelineNameForInstallation({
      pipelineName: dataStream.ingest_pipeline,
      dataStream,
      packageVersion,
    });
  }

  // Datastream now throw an error if the aliases field is present so ensure that we remove that field.
  const getTemplateRes = await retryTransientEsErrors(
    () =>
      esClient.indices.getIndexTemplate(
        {
          name: templateName,
        },
        {
          ignore: [404],
        }
      ),
    { logger }
  );

  const existingIndexTemplate = getTemplateRes?.index_templates?.[0];
  if (
    existingIndexTemplate &&
    existingIndexTemplate.name === templateName &&
    existingIndexTemplate?.index_template?.template?.aliases
  ) {
    const updateIndexTemplateParams = {
      name: templateName,
      body: {
        ...existingIndexTemplate.index_template,
        template: {
          ...existingIndexTemplate.index_template.template,
          // Remove the aliases field
          aliases: undefined,
        },
      },
    };

    await retryTransientEsErrors(
      () => esClient.indices.putIndexTemplate(updateIndexTemplateParams, { ignore: [404] }),
      { logger }
    );
  }

  const defaultSettings = buildDefaultSettings({
    templateName,
    packageName,
    fields: validFields,
    type: dataStream.type,
    ilmPolicy: dataStream.ilm_policy,
  });

  const { componentTemplateNames } = await installDataStreamComponentTemplates({
    mappings,
    templateName,
    registryElasticsearch: dataStream.elasticsearch,
    esClient,
    logger,
    packageName,
    defaultSettings,
  });

  const template = getTemplate({
    templateIndexPattern,
    pipelineName,
    packageName,
    composedOfTemplates: componentTemplateNames,
    templatePriority,
    hidden: dataStream.hidden,
  });

  // TODO: Check return values for errors
  const esClientParams = {
    name: templateName,
    body: template,
  };

  await retryTransientEsErrors(
    () => esClient.indices.putIndexTemplate(esClientParams, { ignore: [404] }),
    { logger }
  );

  return {
    templateName,
    indexTemplate: template,
  };
}

export function getAllTemplateRefs(installedTemplates: IndexTemplateEntry[]) {
  return installedTemplates.flatMap((installedTemplate) => {
    const indexTemplates = [
      {
        id: installedTemplate.templateName,
        type: ElasticsearchAssetType.indexTemplate,
      },
    ];
    const componentTemplates = installedTemplate.indexTemplate.composed_of
      // Filter global component template shared between integrations
      .filter(
        (componentTemplateId) => !FLEET_COMPONENT_TEMPLATE_NAMES.includes(componentTemplateId)
      )
      .map((componentTemplateId) => ({
        id: componentTemplateId,
        type: ElasticsearchAssetType.componentTemplate,
      }));
    return indexTemplates.concat(componentTemplates);
  });
}
