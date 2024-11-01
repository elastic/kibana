/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { dataStreamService } from '../../../services';
import { getComponentTemplatePrefixFromIndexTemplate } from '../../../../common/utils/component_template_name';

export type ValidateAndReturnIndexTemplateResponse =
  | { isValid: false }
  | { isValid: true; indexTemplateName: string };

export async function validateAndReturnIndexTemplate({
  esClient,
  dataStream,
}: {
  esClient: ElasticsearchClient;
  dataStream: string;
}): Promise<ValidateAndReturnIndexTemplateResponse> {
  const [dataStreamInfo] = await dataStreamService.getMatchingDataStreams(esClient, dataStream);

  const indexTemplate = dataStreamInfo?.template;

  // If index template does not exist, then for sure its not equivalent to an Integration
  if (!indexTemplate) {
    return { isValid: false };
  }

  // cleaning the index template name as some have @template suffix
  const indexTemplateNameWithoutSuffix = getComponentTemplatePrefixFromIndexTemplate(indexTemplate);

  // Check if index template name has both type and dataset part
  const isDedicatedComponentTemplate = indexTemplateNameWithoutSuffix.split('-').length === 2;

  // If only 1 part exists, then it's not a dedicated index template
  // If the data stream starts with this index template, then it's a dedicated index template
  if (!isDedicatedComponentTemplate || !dataStream.startsWith(indexTemplateNameWithoutSuffix)) {
    return { isValid: false };
  }

  return { isValid: true, indexTemplateName: indexTemplate };
}
