/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, concat, uniqBy, omit } from 'lodash';
import Boom from '@hapi/boom';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import pMap from 'p-map';

import type {
  IndicesCreateRequest,
  ClusterPutComponentTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';

import { ElasticsearchAssetType } from '../../../../types';
import {
  getPipelineNameForDatastream,
  getRegistryDataStreamAssetBaseName,
} from '../../../../../common/services';
import type {
  RegistryDataStream,
  IndexTemplateEntry,
  RegistryElasticsearch,
  IndexTemplate,
  IndexTemplateMappings,
  TemplateMapEntry,
  TemplateMap,
  EsAssetReference,
  ExperimentalDataStreamFeature,
} from '../../../../types';
import type { Fields } from '../../fields/field';
import { loadDatastreamsFieldsFromYaml, processFields } from '../../fields/field';
import { getAssetFromAssetsMap, getPathParts } from '../../archive';
import {
  FLEET_COMPONENT_TEMPLATES,
  PACKAGE_TEMPLATE_SUFFIX,
  USER_SETTINGS_TEMPLATE_SUFFIX,
  STACK_COMPONENT_TEMPLATES,
  MAX_CONCURRENT_COMPONENT_TEMPLATES,
} from '../../../../constants';
import { getESAssetMetadata } from '../meta';
import { retryTransientEsErrors } from '../retry';
import {
  applyDocOnlyValueToMapping,
  forEachMappings,
} from '../../../experimental_datastream_features_helper';
import { appContextService } from '../../../app_context';
import type { PackageInstallContext } from '../../../../../common/types';

import {
  generateMappings,
  generateTemplateName,
  generateTemplateIndexPattern,
  getTemplate,
  getTemplatePriority,
} from './template';
import { buildDefaultSettings } from './default_settings';
import { isUserSettingsTemplate } from './utils';

const FLEET_COMPONENT_TEMPLATE_NAMES = FLEET_COMPONENT_TEMPLATES.map((tmpl) => tmpl.name);

export const prepareToInstallTemplates = (
  packageInstallContext: PackageInstallContext,
  esReferences: EsAssetReference[],
  experimentalDataStreamFeatures: ExperimentalDataStreamFeature[] = [],
  onlyForDataStreams?: RegistryDataStream[]
): {
  assetsToAdd: EsAssetReference[];
  assetsToRemove: EsAssetReference[];
  install: (esClient: ElasticsearchClient, logger: Logger) => Promise<IndexTemplateEntry[]>;
} => {
  const { packageInfo } = packageInstallContext;
  // remove package installation's references to index templates
  const assetsToRemove = esReferences.filter(
    ({ type }) =>
      type === ElasticsearchAssetType.indexTemplate ||
      type === ElasticsearchAssetType.componentTemplate
  );

  // build templates per data stream from yml files
  const dataStreams = onlyForDataStreams || packageInfo.data_streams;
  if (!dataStreams) return { assetsToAdd: [], assetsToRemove, install: () => Promise.resolve([]) };

  const templates = dataStreams.map((dataStream) => {
    const experimentalDataStreamFeature = experimentalDataStreamFeatures.find(
      (datastreamFeature) =>
        datastreamFeature.data_stream === getRegistryDataStreamAssetBaseName(dataStream)
    );

    return prepareTemplate({ packageInstallContext, dataStream, experimentalDataStreamFeature });
  });

  const assetsToAdd = getAllTemplateRefs(templates.map((template) => template.indexTemplate));

  return {
    assetsToAdd,
    assetsToRemove,
    install: async (esClient, logger) => {
      // install any pre-built index template assets,
      // atm, this is only the base package's global index templates
      // Install component templates first, as they are used by the index templates
      await installPreBuiltComponentTemplates(packageInstallContext, esClient, logger);
      await installPreBuiltTemplates(packageInstallContext, esClient, logger);

      await pMap(
        templates,
        (template) =>
          installComponentAndIndexTemplateForDataStream({
            esClient,
            logger,
            componentTemplates: template.componentTemplates,
            indexTemplate: template.indexTemplate,
          }),
        {
          concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES,
        }
      );

      return templates.map((template) => template.indexTemplate);
    },
  };
};

const installPreBuiltTemplates = async (
  packageInstallContext: PackageInstallContext,
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  const templatePaths = packageInstallContext.paths.filter((path) => isTemplate(path));
  try {
    await pMap(
      templatePaths,
      async (path) => {
        const { file } = getPathParts(path);
        const templateName = file.substr(0, file.lastIndexOf('.'));
        const content = JSON.parse(
          getAssetFromAssetsMap(packageInstallContext.assetsMap, path).toString('utf8')
        );

        const esClientParams = { name: templateName, body: content };
        const esClientRequestOptions = { ignore: [404] };

        if (Object.hasOwn(content, 'template') || Object.hasOwn(content, 'composed_of')) {
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
      },
      {
        concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES,
      }
    );
  } catch (e) {
    throw new Boom.Boom(`Error installing prebuilt index templates ${e.message}`, {
      statusCode: 400,
    });
  }
};

const installPreBuiltComponentTemplates = async (
  packageInstallContext: PackageInstallContext,
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  const templatePaths = packageInstallContext.paths.filter((path) => isComponentTemplate(path));
  try {
    await pMap(
      templatePaths,
      async (path) => {
        const { file } = getPathParts(path);
        const templateName = file.substr(0, file.lastIndexOf('.'));
        const content = JSON.parse(
          getAssetFromAssetsMap(packageInstallContext.assetsMap, path).toString('utf8')
        );

        const esClientParams = {
          name: templateName,
          body: content,
        };

        return retryTransientEsErrors(
          () => esClient.cluster.putComponentTemplate(esClientParams, { ignore: [404] }),
          { logger }
        );
      },
      {
        concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES,
      }
    );
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
  // update index template first in case TSDS was removed, so that it does not become invalid
  await updateIndexTemplateIfTsdsDisabled({ esClient, logger, indexTemplate });

  await installDataStreamComponentTemplates({ esClient, logger, componentTemplates });
  await installTemplate({ esClient, logger, template: indexTemplate });
}

async function updateIndexTemplateIfTsdsDisabled({
  esClient,
  logger,
  indexTemplate,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  indexTemplate: IndexTemplateEntry;
}) {
  try {
    const existingIndexTemplate = await esClient.indices.getIndexTemplate({
      name: indexTemplate.templateName,
    });
    if (
      existingIndexTemplate.index_templates?.[0]?.index_template.template?.settings?.index?.mode ===
        'time_series' &&
      indexTemplate.indexTemplate.template.settings.index.mode !== 'time_series'
    ) {
      await installTemplate({ esClient, logger, template: indexTemplate });
    }
  } catch (e) {
    if (e.statusCode === 404) {
      logger.debug(
        `Index template ${indexTemplate.templateName} does not exist, skipping time_series check`
      );
    } else {
      logger.warn(
        `Error while trying to install index template before component template: ${e.message}`
      );
    }
  }
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
      () =>
        esClient.cluster.putComponentTemplate(
          // @ts-expect-error lifecycle is not yet supported here
          {
            name,
            body,
            create,
          } as ClusterPutComponentTemplateRequest,
          { ignore: [404] }
        ),
      { logger }
    ),
    name,
  };
}

const DEFAULT_FIELD_LIMIT = 1000;
const MAX_FIELD_LIMIT = 10000;
const FIELD_LIMIT_THRESHOLD = 500;

/**
 * The total field limit is set to 1000 by default, but can be increased to 10000 if the field count is higher than 500.
 * An explicit limit always overrides the default.
 *
 * This can be replaced by a static limit of 1000 once a new major version of the package spec is released which clearly documents the field limit.
 */
function getFieldsLimit(fieldCount: number | undefined, explicitLimit: number | undefined) {
  if (explicitLimit) {
    return explicitLimit;
  }
  if (typeof fieldCount !== 'undefined' && fieldCount > FIELD_LIMIT_THRESHOLD) {
    return MAX_FIELD_LIMIT;
  }
  return DEFAULT_FIELD_LIMIT;
}

export function buildComponentTemplates(params: {
  mappings: IndexTemplateMappings;
  templateName: string;
  registryElasticsearch: RegistryElasticsearch | undefined;
  packageName: string;
  pipelineName?: string;
  defaultSettings: IndexTemplate['template']['settings'];
  experimentalDataStreamFeature?: ExperimentalDataStreamFeature;
  lifecycle?: IndexTemplate['template']['lifecycle'];
  fieldCount?: number;
  type?: string;
}) {
  const {
    templateName,
    registryElasticsearch,
    packageName,
    defaultSettings,
    mappings,
    pipelineName,
    experimentalDataStreamFeature,
    lifecycle,
    fieldCount,
    type,
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
    forEachMappings(mappings.properties, (mappingProp, name) =>
      applyDocOnlyValueToMapping(
        mappingProp,
        name,
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

  const mappingsRuntimeFields = merge(mappings.runtime, indexTemplateMappings.runtime ?? {});

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
            ...templateSettings.index?.mapping,
            total_fields: {
              limit: getFieldsLimit(
                fieldCount,
                templateSettings.index?.mapping?.total_fields?.limit
              ),
            },
          },
        },
      },
      mappings: {
        properties: mappingsProperties,
        ...(Object.keys(mappingsRuntimeFields).length > 0
          ? { runtime: mappingsRuntimeFields }
          : {}),
        dynamic_templates: mappingsDynamicTemplates.length ? mappingsDynamicTemplates : undefined,
        ...omit(indexTemplateMappings, 'properties', 'dynamic_templates', '_source', 'runtime'),
        ...(indexTemplateMappings?._source || sourceModeSynthetic
          ? {
              _source: {
                ...indexTemplateMappings?._source,
                ...(sourceModeSynthetic ? { mode: 'synthetic' } : {}),
              },
            }
          : {}),
      },
      ...(lifecycle ? { lifecycle } : {}),
    },
    _meta,
  };

  // Stub custom template
  if (type) {
    const customTemplateName = `${type}${USER_SETTINGS_TEMPLATE_SUFFIX}`;
    templatesMap[customTemplateName] = {
      template: {
        settings: {},
      },
      _meta,
    };
  }

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
  await pMap(
    Object.entries(componentTemplates),
    async ([name, body]) => {
      // @custom component template should be lazily created by user
      if (isUserSettingsTemplate(name)) {
        return;
      }

      const { clusterPromise } = putComponentTemplate(esClient, logger, { body, name });
      return clusterPromise;
    },
    {
      concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES,
    }
  );
}

export async function ensureDefaultComponentTemplates(
  esClient: ElasticsearchClient,
  logger: Logger
) {
  return await pMap(
    FLEET_COMPONENT_TEMPLATES,
    ({ name, body }) => ensureComponentTemplate(esClient, logger, name, body),
    {
      concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES,
    }
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
    logger.info(`Creating write index [${writeIndexName}], alias [${aliasName}]`);

    await retryTransientEsErrors(
      () => esClient.indices.create({ index: writeIndexName, ...body }, { ignore: [404] }),
      {
        logger,
      }
    );
  }
}

function countFields(fields: Fields): number {
  return fields.reduce((acc, field) => {
    let subCount = 1;
    if (field.fields) {
      subCount += countFields(field.fields);
    }
    if (field.multi_fields) {
      subCount += countFields(field.multi_fields);
    }
    return subCount + acc;
  }, 0);
}

export function prepareTemplate({
  packageInstallContext,
  dataStream,
  experimentalDataStreamFeature,
}: {
  packageInstallContext: PackageInstallContext;
  dataStream: RegistryDataStream;
  experimentalDataStreamFeature?: ExperimentalDataStreamFeature;
}): { componentTemplates: TemplateMap; indexTemplate: IndexTemplateEntry } {
  const { name: packageName, version: packageVersion } = packageInstallContext.packageInfo;
  const fields = loadDatastreamsFieldsFromYaml(packageInstallContext, dataStream.path);

  const isIndexModeTimeSeries =
    dataStream.elasticsearch?.index_mode === 'time_series' ||
    !!experimentalDataStreamFeature?.features.tsdb;

  const validFields = processFields(fields);

  const mappings = generateMappings(validFields, isIndexModeTimeSeries);
  const templateName = generateTemplateName(dataStream);
  const templateIndexPattern = generateTemplateIndexPattern(dataStream);
  const templatePriority = getTemplatePriority(dataStream);

  const isILMPolicyDisabled = appContextService.getConfig()?.internal?.disableILMPolicies ?? false;
  const lifecyle = isILMPolicyDisabled && dataStream.lifecycle ? dataStream.lifecycle : undefined;

  const pipelineName = getPipelineNameForDatastream({ dataStream, packageVersion });

  const defaultSettings = buildDefaultSettings({
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
    lifecycle: lifecyle,
    fieldCount: countFields(validFields),
    type: dataStream.type,
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
    type: dataStream.type,
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
      // Filter stack component templates shared between integrations
      .filter((componentTemplateId) => !STACK_COMPONENT_TEMPLATES.includes(componentTemplateId))
      .map((componentTemplateId) => ({
        id: componentTemplateId,
        type: ElasticsearchAssetType.componentTemplate,
      }));

    return indexTemplates.concat(componentTemplates);
  });
}
