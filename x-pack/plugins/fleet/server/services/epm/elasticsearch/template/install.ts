/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import Boom from '@hapi/boom';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { ElasticsearchAssetType } from '../../../../types';
import type {
  RegistryDataStream,
  IndexTemplateEntry,
  RegistryElasticsearch,
  InstallablePackage,
  IndexTemplate,
  IndexTemplateMappings,
  TemplateMapEntry,
  TemplateMap,
  EsAssetReference,
} from '../../../../types';

import { loadFieldsFromYaml, processFields } from '../../fields/field';
import type { Field } from '../../fields/field';
import { getPipelineNameForInstallation } from '../ingest_pipeline/install';
import { getAsset, getPathParts } from '../../archive';
import { updateEsAssetReferences } from '../../packages/install';
import {
  FLEET_COMPONENT_TEMPLATES,
  PACKAGE_TEMPLATE_SUFFIX,
  USER_SETTINGS_TEMPLATE_SUFFIX,
} from '../../../../constants';

import { getESAssetMetadata } from '../meta';
import { retryTransientEsErrors } from '../retry';

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
  savedObjectsClient: SavedObjectsClientContract,
  esReferences: EsAssetReference[]
): Promise<{
  installedTemplates: IndexTemplateEntry[];
  installedEsReferences: EsAssetReference[];
}> => {
  // install any pre-built index template assets,
  // atm, this is only the base package's global index templates
  // Install component templates first, as they are used by the index templates
  await installPreBuiltComponentTemplates(paths, esClient, logger);
  await installPreBuiltTemplates(paths, esClient, logger);

  // remove package installation's references to index templates
  esReferences = await updateEsAssetReferences(
    savedObjectsClient,
    installablePackage.name,
    esReferences,
    {
      assetsToRemove: esReferences.filter(
        ({ type }) =>
          type === ElasticsearchAssetType.indexTemplate ||
          type === ElasticsearchAssetType.componentTemplate
      ),
    }
  );

  // build templates per data stream from yml files
  const dataStreams = installablePackage.data_streams;
  if (!dataStreams) return { installedTemplates: [], installedEsReferences: esReferences };

  const installedTemplatesNested = await Promise.all(
    dataStreams.map((dataStream) =>
      installTemplateForDataStream({
        pkg: installablePackage,
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
  esReferences = await updateEsAssetReferences(
    savedObjectsClient,
    installablePackage.name,
    esReferences,
    { assetsToAdd: installedIndexTemplateRefs }
  );

  return { installedTemplates, installedEsReferences: esReferences };
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
  pkg: InstallablePackage;
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
  const packageTemplateName = `${templateName}${PACKAGE_TEMPLATE_SUFFIX}`;
  const userSettingsTemplateName = `${templateName}${USER_SETTINGS_TEMPLATE_SUFFIX}`;

  const templatesMap: TemplateMap = {};
  const _meta = getESAssetMetadata({ packageName });

  const indexTemplateSettings = registryElasticsearch?.['index_template.settings'] ?? {};

  const templateSettings = merge(defaultSettings, indexTemplateSettings);

  templatesMap[packageTemplateName] = {
    template: {
      settings: {
        ...templateSettings,
        index: {
          ...templateSettings.index,
          mapping: {
            ...templateSettings?.mapping,
            total_fields: {
              ...templateSettings?.mapping?.total_fields,
              limit: '10000',
            },
          },
        },
      },
      mappings: merge(mappings, registryElasticsearch?.['index_template.mappings'] ?? {}),
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
        try {
          // Attempt to create custom component templates, ignore if they already exist
          const { clusterPromise } = putComponentTemplate(esClient, logger, {
            body,
            name,
            create: true,
          });
          return await clusterPromise;
        } catch (e) {
          if (e?.statusCode === 400 && e.body?.error?.reason.includes('already exists')) {
            // ignore
          } else {
            throw e;
          }
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
