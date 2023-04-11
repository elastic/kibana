/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import Boom from '@hapi/boom';
import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import { ElasticsearchAssetType } from '../../../../types';
import type {
  RegistryDataStream,
  IndexTemplateEntry,
  RegistryElasticsearch,
  InstallablePackage,
  IndexTemplate,
} from '../../../../types';
import { loadFieldsFromYaml, processFields } from '../../fields/field';
import type { Field } from '../../fields/field';
import { getPipelineNameForInstallation } from '../ingest_pipeline/install';
import { getAsset, getPathParts } from '../../archive';
import { removeAssetTypesFromInstalledEs, saveInstalledEsRefs } from '../../packages/install';
import {
  FLEET_GLOBAL_COMPONENT_TEMPLATE_NAME,
  FLEET_GLOBAL_COMPONENT_TEMPLATE_CONTENT,
} from '../../../../constants';

import {
  generateMappings,
  generateTemplateName,
  generateTemplateIndexPattern,
  getTemplate,
  getTemplatePriority,
} from './template';
import { buildDefaultSettings } from './default_settings';

export const installTemplates = async (
  installablePackage: InstallablePackage,
  esClient: ElasticsearchClient,
  paths: string[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<IndexTemplateEntry[]> => {
  // install any pre-built index template assets,
  // atm, this is only the base package's global index templates
  // Install component templates first, as they are used by the index templates
  await installPreBuiltComponentTemplates(paths, esClient);
  await installPreBuiltTemplates(paths, esClient);

  // remove package installation's references to index templates
  await removeAssetTypesFromInstalledEs(savedObjectsClient, installablePackage.name, [
    ElasticsearchAssetType.indexTemplate,
    ElasticsearchAssetType.componentTemplate,
  ]);
  // build templates per data stream from yml files
  const dataStreams = installablePackage.data_streams;
  if (!dataStreams) return [];

  const installedTemplatesNested = await Promise.all(
    dataStreams.map((dataStream) =>
      installTemplateForDataStream({
        pkg: installablePackage,
        esClient,
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

const installPreBuiltTemplates = async (paths: string[], esClient: ElasticsearchClient) => {
  const templatePaths = paths.filter((path) => isTemplate(path));
  const templateInstallPromises = templatePaths.map(async (path) => {
    const { file } = getPathParts(path);
    const templateName = file.substr(0, file.lastIndexOf('.'));
    const content = JSON.parse(getAsset(path).toString('utf8'));

    const esClientParams = { name: templateName, body: content };
    const esClientRequestOptions = { ignore: [404] };

    if (content.hasOwnProperty('template') || content.hasOwnProperty('composed_of')) {
      // Template is v2
      return esClient.indices.putIndexTemplate(esClientParams, esClientRequestOptions);
    } else {
      // template is V1
      return esClient.indices.putTemplate(esClientParams, esClientRequestOptions);
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
  esClient: ElasticsearchClient
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

    return esClient.cluster.putComponentTemplate(esClientParams, { ignore: [404] });
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
  dataStream,
}: {
  pkg: InstallablePackage;
  esClient: ElasticsearchClient;
  dataStream: RegistryDataStream;
}): Promise<IndexTemplateEntry> {
  const fields = await loadFieldsFromYaml(pkg, dataStream.path);
  return installTemplate({
    esClient,
    fields,
    dataStream,
    packageVersion: pkg.version,
    packageName: pkg.name,
  });
}

interface TemplateMapEntry {
  _meta: { package?: { name: string } };
  template:
    | {
        mappings: NonNullable<RegistryElasticsearch['index_template.mappings']>;
      }
    | {
        settings: NonNullable<RegistryElasticsearch['index_template.settings']> | object;
      };
}
type TemplateMap = Record<string, TemplateMapEntry>;
function putComponentTemplate(
  esClient: ElasticsearchClient,
  params: {
    body: TemplateMapEntry;
    name: string;
    create?: boolean;
  }
): { clusterPromise: Promise<any>; name: string } {
  const { name, body, create = false } = params;
  return {
    clusterPromise: esClient.cluster.putComponentTemplate(
      { name, body, create },
      { ignore: [404] }
    ),
    name,
  };
}

const mappingsSuffix = '@mappings';
const settingsSuffix = '@settings';
const userSettingsSuffix = '@custom';
type TemplateBaseName = string;
type UserSettingsTemplateName = `${TemplateBaseName}${typeof userSettingsSuffix}`;

const isUserSettingsTemplate = (name: string): name is UserSettingsTemplateName =>
  name.endsWith(userSettingsSuffix);

function buildComponentTemplates(params: {
  templateName: string;
  registryElasticsearch: RegistryElasticsearch | undefined;
  packageName: string;
  defaultSettings: IndexTemplate['template']['settings'];
}) {
  const { templateName, registryElasticsearch, packageName, defaultSettings } = params;
  const mappingsTemplateName = `${templateName}${mappingsSuffix}`;
  const settingsTemplateName = `${templateName}${settingsSuffix}`;
  const userSettingsTemplateName = `${templateName}${userSettingsSuffix}`;

  const templatesMap: TemplateMap = {};
  const _meta = { package: { name: packageName } };

  if (registryElasticsearch && registryElasticsearch['index_template.mappings']) {
    templatesMap[mappingsTemplateName] = {
      template: {
        mappings: registryElasticsearch['index_template.mappings'],
      },
      _meta,
    };
  }

  templatesMap[settingsTemplateName] = {
    template: {
      settings: merge(defaultSettings, registryElasticsearch?.['index_template.settings'] ?? {}),
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
  templateName: string;
  registryElasticsearch: RegistryElasticsearch | undefined;
  esClient: ElasticsearchClient;
  packageName: string;
  defaultSettings: IndexTemplate['template']['settings'];
}) {
  const { templateName, registryElasticsearch, esClient, packageName, defaultSettings } = params;
  const templates = buildComponentTemplates({
    templateName,
    registryElasticsearch,
    packageName,
    defaultSettings,
  });
  const templateNames = Object.keys(templates);
  const templateEntries = Object.entries(templates);
  // TODO: Check return values for errors
  await Promise.all(
    templateEntries.map(async ([name, body]) => {
      if (isUserSettingsTemplate(name)) {
        // look for existing user_settings template
        const result = await esClient.cluster.getComponentTemplate({ name }, { ignore: [404] });
        const hasUserSettingsTemplate = result.body.component_templates?.length === 1;
        if (!hasUserSettingsTemplate) {
          // only add if one isn't already present
          const { clusterPromise } = putComponentTemplate(esClient, {
            body,
            name,
          });
          return clusterPromise;
        }
      } else {
        const { clusterPromise } = putComponentTemplate(esClient, { body, name });
        return clusterPromise;
      }
    })
  );

  return templateNames;
}

export async function ensureDefaultComponentTemplate(esClient: ElasticsearchClient) {
  const { body: getTemplateRes } = await esClient.cluster.getComponentTemplate(
    {
      name: FLEET_GLOBAL_COMPONENT_TEMPLATE_NAME,
    },
    {
      ignore: [404],
    }
  );

  const existingTemplate = getTemplateRes?.component_templates?.[0];
  if (!existingTemplate) {
    await putComponentTemplate(esClient, {
      name: FLEET_GLOBAL_COMPONENT_TEMPLATE_NAME,
      body: FLEET_GLOBAL_COMPONENT_TEMPLATE_CONTENT,
    });
  }

  return { isCreated: !existingTemplate };
}

export async function installTemplate({
  esClient,
  fields,
  dataStream,
  packageVersion,
  packageName,
}: {
  esClient: ElasticsearchClient;
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
  const { body: getTemplateRes } = await esClient.indices.getIndexTemplate(
    {
      name: templateName,
    },
    {
      ignore: [404],
    }
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

    await esClient.indices.putIndexTemplate(updateIndexTemplateParams, { ignore: [404] });
  }

  const defaultSettings = buildDefaultSettings({
    templateName,
    packageName,
    fields: validFields,
    type: dataStream.type,
    ilmPolicy: dataStream.ilm_policy,
  });

  const composedOfTemplates = await installDataStreamComponentTemplates({
    templateName,
    registryElasticsearch: dataStream.elasticsearch,
    esClient,
    packageName,
    defaultSettings,
  });

  const template = getTemplate({
    type: dataStream.type,
    templateIndexPattern,
    fields: validFields,
    mappings,
    pipelineName,
    packageName,
    composedOfTemplates,
    templatePriority,
    hidden: dataStream.hidden,
  });

  // TODO: Check return values for errors
  const esClientParams = {
    name: templateName,
    body: template,
  };

  await esClient.indices.putIndexTemplate(esClientParams, { ignore: [404] });

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
      .filter((componentTemplateId) => componentTemplateId !== FLEET_GLOBAL_COMPONENT_TEMPLATE_NAME)
      .map((componentTemplateId) => ({
        id: componentTemplateId,
        type: ElasticsearchAssetType.componentTemplate,
      }));
    return indexTemplates.concat(componentTemplates);
  });
}
