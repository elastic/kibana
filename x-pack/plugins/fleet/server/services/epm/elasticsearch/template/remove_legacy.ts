/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterComponentTemplate,
  IndicesGetIndexTemplateIndexTemplateItem,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { InstallablePackage, RegistryDataStream } from '../../../../types';
import { getRegistryDataStreamAssetBaseName } from '../../../../../common/services';
const LEGACY_TEMPLATE_SUFFIXES = ['@mappings', '@settings'];

const getComponentTemplateWithSuffix = (dataStream: RegistryDataStream, suffix: string) => {
  const baseName = getRegistryDataStreamAssetBaseName(dataStream);

  return baseName + suffix;
};

export const _getLegacyComponentTemplatesForPackage = (
  componentTemplates: ClusterComponentTemplate[],
  installablePackage: InstallablePackage
): string[] => {
  const legacyNamesLookup: Set<string> = new Set();

  // fill a map with all possible @mappings and @settings component
  // template names for fast lookup below.
  installablePackage.data_streams?.forEach((ds) => {
    LEGACY_TEMPLATE_SUFFIXES.forEach((suffix) => {
      legacyNamesLookup.add(getComponentTemplateWithSuffix(ds, suffix));
    });
  });

  return componentTemplates.reduce<string[]>((legacyTemplates, componentTemplate) => {
    if (!legacyNamesLookup.has(componentTemplate.name)) return legacyTemplates;

    if (componentTemplate.component_template._meta?.package?.name !== installablePackage.name) {
      return legacyTemplates;
    }

    return legacyTemplates.concat(componentTemplate.name);
  }, []);
};

const _deleteComponentTemplates = async (params: {
  templateNames: string[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  const { templateNames, esClient, logger } = params;
  const deleteResults = await Promise.allSettled(
    templateNames.map((name) => esClient.cluster.deleteComponentTemplate({ name }))
  );

  const errors = deleteResults.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

  if (errors.length) {
    const prettyErrors = errors.map((e) => `"${e.reason}"`).join(', ');
    logger.debug(
      `Encountered ${errors.length} errors deleting legacy component templates: ${prettyErrors}`
    );
  }
};

export const _getIndexTemplatesToUsedByMap = (
  indexTemplates: IndicesGetIndexTemplateIndexTemplateItem[]
) => {
  const lookupMap: Map<string, string[]> = new Map();

  indexTemplates.forEach(({ name: indexTemplateName, index_template: indexTemplate }) => {
    const composedOf = indexTemplate?.composed_of;

    if (!composedOf) return;

    composedOf.forEach((componentTemplateName) => {
      const existingEntry = lookupMap.get(componentTemplateName) || [];

      lookupMap.set(componentTemplateName, existingEntry.concat(indexTemplateName));
    });
  });
  return lookupMap;
};

const _getAllComponentTemplates = async (esClient: ElasticsearchClient) => {
  const { component_templates: componentTemplates } = await esClient.cluster.getComponentTemplate();

  return componentTemplates;
};

const _getAllIndexTemplatesWithComposedOf = async (esClient: ElasticsearchClient) => {
  const { index_templates: indexTemplates } = await esClient.indices.getIndexTemplate();
  return indexTemplates.filter((tmpl) => tmpl.index_template.composed_of?.length);
};

export const _filterComponentTemplatesInUse = ({
  componentTemplateNames,
  indexTemplates,
  logger,
}: {
  componentTemplateNames: string[];
  indexTemplates: IndicesGetIndexTemplateIndexTemplateItem[];
  logger: Logger;
}): string[] => {
  const usedByLookup = _getIndexTemplatesToUsedByMap(indexTemplates);

  return componentTemplateNames.filter((componentTemplateName) => {
    const indexTemplatesUsingComponentTemplate = usedByLookup.get(componentTemplateName);

    if (indexTemplatesUsingComponentTemplate?.length) {
      const prettyTemplates = indexTemplatesUsingComponentTemplate.join(', ');
      logger.debug(
        `Not deleting legacy template ${componentTemplateName} as it is in use by index templates: ${prettyTemplates}`
      );
      return false;
    }

    return true;
  });
};

export const removeLegacyTemplates = async (params: {
  packageInfo: InstallablePackage;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  const { packageInfo, esClient, logger } = params;

  const allComponentTemplates = await _getAllComponentTemplates(esClient);

  const legacyComponentTemplateNames = _getLegacyComponentTemplatesForPackage(
    allComponentTemplates,
    packageInfo
  );

  if (!legacyComponentTemplateNames.length) return;

  // all index templates that are composed of at least one component template
  const allIndexTemplatesWithComposedOf = await _getAllIndexTemplatesWithComposedOf(esClient);

  let templatesToDelete = legacyComponentTemplateNames;
  if (allIndexTemplatesWithComposedOf.length) {
    // get the component templates not in use by any index templates
    templatesToDelete = _filterComponentTemplatesInUse({
      componentTemplateNames: legacyComponentTemplateNames,
      indexTemplates: allIndexTemplatesWithComposedOf,
      logger,
    });
  }

  if (!templatesToDelete.length) return;

  await _deleteComponentTemplates({
    templateNames: templatesToDelete,
    esClient,
    logger,
  });
};
