/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SearchHit } from '@kbn/es-types';
import { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';
import { TIMESTAMP, _IGNORED } from '../../../../common/es_fields';

export async function getIgnoredDc({
  datasetQualityESClient,
  dataStream,
  field,
}: {
  datasetQualityESClient: DatasetQualityESClient;
  dataStream: string;
  field: string;
}): Promise<SearchHit> {
  const topLevelField = field.split('.')[0];

  const ignoredDoc = await datasetQualityESClient.search({
    _source: [topLevelField],
    index: dataStream,
    size: 1,
    query: {
      exists: {
        field: _IGNORED,
      },
    },
    sort: [
      {
        [TIMESTAMP]: {
          order: 'desc',
        },
      },
    ],
  });

  return ignoredDoc.hits.hits[0];
}
