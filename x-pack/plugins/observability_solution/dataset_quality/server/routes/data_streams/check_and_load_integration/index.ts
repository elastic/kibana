/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { PackageClient } from '@kbn/fleet-plugin/server';
import { Logger } from '@kbn/logging';
import { validateCustomComponentTemplate } from './validate_custom_component_template';
import { getIntegrations } from '../../integrations/get_integrations';
import { getComponentTemplatePrefixFromIndexTemplate } from '../../../../common/utils/component_template_name';
import { CheckAndLoadIntegrationResponse } from '../../../../common/api_types';
import { dataStreamService } from '../../../services';

export async function checkAndLoadIntegration({
  esClient,
  packageClient,
  logger,
  dataStream,
}: {
  esClient: ElasticsearchClient;
  packageClient: PackageClient;
  logger: Logger;
  dataStream: string;
}): Promise<CheckAndLoadIntegrationResponse> {
  const [dataStreamInfo] = await dataStreamService.getMatchingDataStreams(esClient, dataStream);

  const indexTemplate = dataStreamInfo?.template;
  const isManaged = dataStreamInfo?._meta?.managed;

  const integrationNameFromDataStream = dataStreamInfo?._meta?.package?.name;

  // Index template must be present and isManaged should be true or
  // integration name should be present
  // Else it's not an integration
  if ((!indexTemplate || !isManaged) && !integrationNameFromDataStream) {
    return { isIntegration: false };
  }

  const allIntegrations = await getIntegrations({ packageClient, logger });

  // If integration name is present, then we find and return the integration
  if (integrationNameFromDataStream) {
    const integrationDetailsMatchingDataStream = allIntegrations.find(
      (integration) => integration.name === integrationNameFromDataStream
    );

    if (integrationDetailsMatchingDataStream) {
      return { isIntegration: true, integration: integrationDetailsMatchingDataStream };
    }

    return { isIntegration: false };
  }

  // cleaning the index template name as some have @template suffix
  const indexTemplateNameWithoutSuffix = getComponentTemplatePrefixFromIndexTemplate(indexTemplate);

  // Check if index template name has both type and dataset part
  const isDedicatedComponentTemplate = indexTemplateNameWithoutSuffix.split('-').length === 2;

  // If only 1 part exists, then it's not a dedicated index template
  // Data stream name must starts with this index template, then it's a dedicated index template else not
  if (!isDedicatedComponentTemplate || !dataStream.startsWith(indexTemplateNameWithoutSuffix)) {
    return { isIntegration: false };
  }

  const isValidCustomComponentTemplate = await validateCustomComponentTemplate({
    esClient,
    indexTemplateName: indexTemplate,
  });

  if (!isValidCustomComponentTemplate) {
    return { isIntegration: false };
  }

  const datasetName = indexTemplateNameWithoutSuffix.split('-')[1];

  const integrationFromDataset = allIntegrations.find(
    (integration) => datasetName in (integration?.datasets ?? {})
  );

  if (integrationFromDataset) {
    return { isIntegration: true, integration: integrationFromDataset };
  }

  return { isIntegration: false };
}
