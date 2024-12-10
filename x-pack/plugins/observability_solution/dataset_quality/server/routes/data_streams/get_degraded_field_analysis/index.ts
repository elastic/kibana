/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { DegradedFieldAnalysis } from '../../../../common/api_types';
import { createDatasetQualityESClient } from '../../../utils';
import { getDataStreamMapping } from './get_datastream_mappings';
import { getDataStreamSettings } from './get_datastream_settings';

// TODO: The API should also in future return some analysis around the ignore_malformed check.
// As this check is expensive and steps are not very concrete, its not done for the initial iteration
export async function analyzeDegradedField({
  esClient,
  dataStream,
  degradedField,
  lastBackingIndex,
}: {
  esClient: ElasticsearchClient;
  dataStream: string;
  degradedField: string;
  lastBackingIndex: string;
}): Promise<DegradedFieldAnalysis> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const [
    { fieldCount, fieldPresent, fieldMapping },
    {
      nestedFieldLimit,
      totalFieldLimit,
      ignoreDynamicBeyondLimit,
      ignoreMalformed,
      defaultPipeline,
    },
  ] = await Promise.all([
    getDataStreamMapping({
      datasetQualityESClient,
      dataStream,
      field: degradedField,
      lastBackingIndex,
    }),
    getDataStreamSettings({ datasetQualityESClient, dataStream, lastBackingIndex }),
  ]);

  return {
    isFieldLimitIssue: Boolean(
      !fieldPresent && ignoreDynamicBeyondLimit && fieldCount === totalFieldLimit
    ),
    fieldCount,
    fieldMapping,
    totalFieldLimit,
    ignoreMalformed,
    nestedFieldLimit,
    defaultPipeline,
  };
}
