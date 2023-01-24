/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, concat, uniqBy, omit } from 'lodash';
import Boom from '@hapi/boom';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';

import {
  FILE_STORAGE_INTEGRATION_INDEX_NAMES,
  FILE_STORAGE_INTEGRATION_NAMES,
} from '../../../../../common/constants';

import { ElasticsearchAssetType } from '../../../../types';
import {
  getFileWriteIndexName,
  getFileStorageWriteIndexBody,
  getPipelineNameForDatastream,
  getFileDataIndexName,
  getFileMetadataIndexName,
  getRegistryDataStreamAssetBaseName,
} from '../../../../../common/services';
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
  PackageInfo,
  ExperimentalDataStreamFeature,
} from '../../../../types';
import { loadFieldsFromYaml, processFields } from '../../fields/field';
import { getAsset, getPathParts } from '../../archive';
import {
  FLEET_COMPONENT_TEMPLATES,
  PACKAGE_TEMPLATE_SUFFIX,
  USER_SETTINGS_TEMPLATE_SUFFIX,
} from '../../../../constants';

import { getESAssetMetadata } from '../meta';
import { retryTransientEsErrors } from '../retry';

import {
  applyDocOnlyValueToMapping,
  forEachMappings,
} from '../../../experimental_datastream_features_helper';

import {
  generateMappings,
  generateTemplateName,
  generateTemplateIndexPattern,
  getTemplate,
  getTemplatePriority,
} from './template';
import { buildDefaultSettings } from './default_settings';

const FLEET_COMPONENT_TEMPLATE_NAMES = FLEET_COMPONENT_TEMPLATES.map((tmpl) => tmpl.name);

export const prepareToInstallTemplates = (
  installablePackage: InstallablePackage | PackageInfo,
  paths: string[],
  esReferences: EsAssetReference[],
  experimentalDataStreamFeatures: ExperimentalDataStreamFeature[] = [],
  onlyForDataStreams?: RegistryDataStream[]
): {
  assetsToAdd: EsAssetReference[];
  assetsToRemove: EsAssetReference[];
  install: (esClient: ElasticsearchClient, logger: Logger) => Promise<IndexTemplateEntry[]>;
} => {
  // remove package installation's references to index templates
  const assetsToRemove = esReferences.filter(
    ({ type }) =>
      type === ElasticsearchAssetType.indexTemplate ||
      type === ElasticsearchAssetType.componentTemplate
  );

  // build templates per data stream from yml files
  const dataStreams = onlyForDataStreams || installablePackage.data_streams;
  if (!dataStreams) return { assetsToAdd: [], assetsToRemove, install: () => Promise.resolve([]) };

  const templates = dataStreams.map((dataStream) => {
    const experimentalDataStreamFeature = experimentalDataStreamFeatures.find(
      (datastreamFeature) =>
        datastreamFeature.data_stream === getRegistryDataStreamAssetBaseName(dataStream)
    );

    return prepareTemplate({ pkg: installablePackage, dataStream, experimentalDataStreamFeature });
  });

  const assetsToAdd = getAllTemplateRefs(templates.map((template) => template.indexTemplate));

  return {
    assetsToAdd,
    assetsToRemove,
    install: async (esClient, logger) => {
      // install any pre-built index template assets,
      // atm, this is only the base package's global index templates
      // Install component templates first, as they are used by the index templates
      await installPreBuiltComponentTemplates(paths, esClient, logger);
      await installPreBuiltTemplates(paths, esClient, logger);

      await Promise.all(
        templates.map((template) =>
          installComponentAndIndexTemplateForDataStream({
            esClient,
            logger,
            componentTemplates: template.componentTemplates,
            indexTemplate: template.indexTemplate,
          })
        )
      );

      return templates.map((template) => template.indexTemplate);
    },
  };
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
 * installComponentAndIndexTemplateForDataStream installs one template for each data stream
 *
 * The template is currently loaded with the pkgkey-package-data_stream
 */

export async function installComponentAndIndexTemplateForDataStream({
  esClient,
  logger,
  componentTemplates,
  indexTemplate,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  componentTemplates: TemplateMap;
  indexTemplate: IndexTemplateEntry;
}) {
  await installDataStreamComponentTemplates({ esClient, logger, componentTemplates });
  await installTemplate({ esClient, logger, template: indexTemplate });
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

export function buildComponentTemplates(params: {
  mappings: IndexTemplateMappings;
  templateName: string;
  registryElasticsearch: RegistryElasticsearch | undefined;
  packageName: string;
  pipelineName?: string;
  defaultSettings: IndexTemplate['template']['settings'];
  experimentalDataStreamFeature?: ExperimentalDataStreamFeature;
}) {
  const {
    templateName,
    registryElasticsearch,
    packageName,
    defaultSettings,
    mappings,
    pipelineName,
    experimentalDataStreamFeature,
  } = params;
  const packageTemplateName = `${templateName}${PACKAGE_TEMPLATE_SUFFIX}`;
  const userSettingsTemplateName = `${templateName}${USER_SETTINGS_TEMPLATE_SUFFIX}`;

  const templatesMap: TemplateMap = {};
  const _meta = getESAssetMetadata({ packageName });

  const indexTemplateSettings = registryElasticsearch?.['index_template.settings'] ?? {};

  const templateSettings = merge(defaultSettings, indexTemplateSettings);

  const indexTemplateMappings = registryElasticsearch?.['index_template.mappings'] ?? {};

  const isDocValueOnlyNumericEnabled =
    experimentalDataStreamFeature?.features.doc_value_only_numeric === true;
  const isDocValueOnlyOtherEnabled =
    experimentalDataStreamFeature?.features.doc_value_only_other === true;

  if (isDocValueOnlyNumericEnabled || isDocValueOnlyOtherEnabled) {
    forEachMappings(mappings.properties, (mappingProp) =>
      applyDocOnlyValueToMapping(
        mappingProp,
        experimentalDataStreamFeature,
        isDocValueOnlyNumericEnabled,
        isDocValueOnlyOtherEnabled
      )
    );
  }

  const mappingsProperties = merge(mappings.properties, indexTemplateMappings.properties ?? {});

  const mappingsDynamicTemplates = uniqBy(
    concat(mappings.dynamic_templates ?? [], indexTemplateMappings.dynamic_templates ?? []),
    (dynampingTemplate) => Object.keys(dynampingTemplate)[0]
  );

  const isTimeSeriesEnabledByDefault = registryElasticsearch?.index_mode === 'time_series';
  const isSyntheticSourceEnabledByDefault = registryElasticsearch?.source_mode === 'synthetic';

  const sourceModeSynthetic =
    experimentalDataStreamFeature?.features.synthetic_source !== false &&
    (experimentalDataStreamFeature?.features.synthetic_source === true ||
      isSyntheticSourceEnabledByDefault ||
      isTimeSeriesEnabledByDefault);

  templatesMap[packageTemplateName] = {
    template: {
      settings: {
        ...templateSettings,
        index: {
          ...templateSettings.index,
          ...(pipelineName ? { default_pipeline: pipelineName } : {}),
          mapping: {
            ...templateSettings?.mapping,
            total_fields: {
              ...templateSettings?.mapping?.total_fields,
              limit: '10000',
            },
          },
        },
      },
      mappings: {
        properties: mappingsProperties,
        dynamic_templates: mappingsDynamicTemplates.length ? mappingsDynamicTemplates : undefined,
        ...omit(indexTemplateMappings, 'properties', 'dynamic_templates', '_source'),
        ...(indexTemplateMappings?._source || sourceModeSynthetic
          ? {
              _source: {
                ...indexTemplateMappings?._source,
                ...(sourceModeSynthetic ? { mode: 'synthetic' } : {}),
              },
            }
          : {}),
      },
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

async function installDataStreamComponentTemplates({
  esClient,
  logger,
  componentTemplates,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  componentTemplates: TemplateMap;
}) {
  await Promise.all(
    Object.entries(componentTemplates).map(async ([name, body]) => {
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

/*
 * Given a list of integration names, if the integrations support file upload
 * then ensure that the alias has a matching write index, as we use "plain" indices
 * not data streams.
 * e.g .fleet-file-data-agent must have .fleet-file-data-agent-00001 as the write index
 * before files can be uploaded.
 */
export async function ensureFileUploadWriteIndices(opts: {
  esClient: ElasticsearchClient;
  logger: Logger;
  integrationNames: string[];
}) {
  const { esClient, logger, integrationNames } = opts;

  const integrationsWithFileUpload = integrationNames.filter((integration) =>
    FILE_STORAGE_INTEGRATION_NAMES.includes(integration as any)
  );

  if (!integrationsWithFileUpload.length) return [];

  const ensure = (aliasName: string) =>
    ensureAliasHasWriteIndex({
      esClient,
      logger,
      aliasName,
      writeIndexName: getFileWriteIndexName(aliasName),
      body: getFileStorageWriteIndexBody(aliasName),
    });

  return Promise.all(
    integrationsWithFileUpload.flatMap((integrationName) => {
      const indexName = FILE_STORAGE_INTEGRATION_INDEX_NAMES[integrationName];
      return [ensure(getFileDataIndexName(indexName)), ensure(getFileMetadataIndexName(indexName))];
    })
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

export async function ensureAliasHasWriteIndex(opts: {
  esClient: ElasticsearchClient;
  logger: Logger;
  aliasName: string;
  writeIndexName: string;
  body: Omit<IndicesCreateRequest, 'index'>;
}): Promise<void> {
  const { esClient, logger, aliasName, writeIndexName, body } = opts;
  const existingIndex = await retryTransientEsErrors(
    () =>
      esClient.indices.exists(
        {
          index: [aliasName],
        },
        {
          ignore: [404],
        }
      ),
    { logger }
  );

  if (!existingIndex) {
    await retryTransientEsErrors(
      () => esClient.indices.create({ index: writeIndexName, ...body }, { ignore: [404] }),
      {
        logger,
      }
    );
  }
}

export function prepareTemplate({
  pkg,
  dataStream,
  experimentalDataStreamFeature,
}: {
  pkg: Pick<PackageInfo, 'name' | 'version' | 'type'>;
  dataStream: RegistryDataStream;
  experimentalDataStreamFeature?: ExperimentalDataStreamFeature;
}): { componentTemplates: TemplateMap; indexTemplate: IndexTemplateEntry } {
  const { name: packageName, version: packageVersion } = pkg;
  const fields = loadFieldsFromYaml(pkg, dataStream.path);
  const validFields = processFields(fields);

  const isIndexModeTimeSeries =
    dataStream.elasticsearch?.index_mode === 'time_series' ||
    experimentalDataStreamFeature?.features.tsdb;

  const mappings = generateMappings(validFields, { isIndexModeTimeSeries });
  const templateName = generateTemplateName(dataStream);
  const templateIndexPattern = generateTemplateIndexPattern(dataStream);
  const templatePriority = getTemplatePriority(dataStream);

  const pipelineName = getPipelineNameForDatastream({ dataStream, packageVersion });

  const defaultSettings = buildDefaultSettings({
    templateName,
    packageName,
    fields: validFields,
    type: dataStream.type,
    ilmPolicy: dataStream.ilm_policy,
  });

  const componentTemplates = buildComponentTemplates({
    defaultSettings,
    mappings,
    packageName,
    templateName,
    pipelineName,
    registryElasticsearch: dataStream.elasticsearch,
    experimentalDataStreamFeature,
  });

  const template = getTemplate({
    templateIndexPattern,
    packageName,
    composedOfTemplates: Object.keys(componentTemplates),
    templatePriority,
    hidden: dataStream.hidden,
    registryElasticsearch: dataStream.elasticsearch,
    mappings,
    isIndexModeTimeSeries,
  });

  return {
    componentTemplates,
    indexTemplate: {
      templateName,
      indexTemplate: template,
    },
  };
}

async function installTemplate({
  esClient,
  logger,
  template,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  template: IndexTemplateEntry;
}) {
  // TODO: Check return values for errors
  const esClientParams = {
    name: template.templateName,
    body: template.indexTemplate,
  };

  await retryTransientEsErrors(
    () => esClient.indices.putIndexTemplate(esClientParams, { ignore: [404] }),
    { logger }
  );
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
