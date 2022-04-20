/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClusterComponentTemplate } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { InstallablePackage, RegistryDataStream } from '../../../../types';
import { getRegistryDataStreamAssetBaseName } from '..';
const LEGACY_TEMPLATE_SUFFIXES = ['@mappings', '@settings'];

const getComponentTemplateWithSuffix = (dataStream: RegistryDataStream, suffix: string) => {
  const baseName = getRegistryDataStreamAssetBaseName(dataStream);

  return baseName + suffix;
};

export const _getLegacyComponentTemplatesForPackage = (
  componentTemplates: ClusterComponentTemplate[],
  installablePackage: InstallablePackage
): string[] => {
  const namesMap: Map<string, void> = new Map();

  // fill a map with all possible @mappings and @settings component
  // template names for fast lookup below.
  installablePackage.data_streams?.forEach((ds) => {
    LEGACY_TEMPLATE_SUFFIXES.forEach((suffix) => {
      namesMap.set(getComponentTemplateWithSuffix(ds, suffix));
    });
  });

  return componentTemplates.reduce<string[]>((legacyTemplates, componentTemplate) => {
    if (!namesMap.has(componentTemplate.name)) return legacyTemplates;

    if (componentTemplate.component_template._meta?.package?.name !== installablePackage.name)
      return legacyTemplates;

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

const _getAllComponentTemplates = async (esClient: ElasticsearchClient) =>
  esClient.cluster.getComponentTemplate().then((result) => result.component_templates);

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

  await _deleteComponentTemplates({
    templateNames: legacyComponentTemplateNames,
    esClient,
    logger,
  });
};
