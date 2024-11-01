/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { PackageClient } from '@kbn/fleet-plugin/server';
import { Logger } from '@kbn/logging';
import { validateAndReturnIndexTemplate } from './validate_index_template';
import { validateCustomComponentTemplate } from './validate_custom_component_template';
import { getIntegrations } from '../../integrations/get_integrations';
import { getComponentTemplatePrefixFromIndexTemplate } from '../../../../common/utils/component_template_name';
import { CheckAndLoadIntegrationResponse } from '../../../../common/api_types';

export async function checkAndLoadIntegration({
  esClient,
  dataStream,
  packageClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  dataStream: string;
  packageClient: PackageClient;
  logger: Logger;
}): Promise<CheckAndLoadIntegrationResponse> {
  const indexTemplateResponse = await validateAndReturnIndexTemplate({
    esClient,
    dataStream,
  });

  if (!indexTemplateResponse.isValid) {
    return { isIntegration: false };
  }

  const isValidCustomComponentTemplate = await validateCustomComponentTemplate({
    esClient,
    indexTemplateName: indexTemplateResponse.indexTemplateName,
  });

  if (!isValidCustomComponentTemplate) {
    return { isIntegration: false };
  }

  const integrationsWithDatasets = await getIntegrations({ packageClient, logger });

  const typeDataSetWithoutSuffix = getComponentTemplatePrefixFromIndexTemplate(
    indexTemplateResponse.indexTemplateName
  );

  const datasetName = typeDataSetWithoutSuffix.split('-')[1];

  const integrationForDatastream = integrationsWithDatasets.find(
    (integration) => datasetName in (integration?.datasets ?? {})
  );

  if (integrationForDatastream) {
    return { isIntegration: true, integration: integrationForDatastream };
  }

  return { isIntegration: false };
}
