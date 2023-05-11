/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';

import { set } from 'lodash';

import { UpdateUnallowedFieldValuesInputs } from '../schemas/update_unallowed_field_values';

type Document = Record<string, unknown>;

const getDoc = ({ indexFieldName, value }: { indexFieldName: string; value: string }): Document => {
  const doc = set({}, indexFieldName, value);
  return { doc };
};

const getBulkOperationContainer = ({
  id,
  indexName,
}: {
  id: string;
  indexName: string;
}): BulkOperationContainer => {
  return { update: { _id: id, _index: indexName } };
};

export const updateUnallowedFieldValues = (
  esClient: ElasticsearchClient,
  items: UpdateUnallowedFieldValuesInputs
) => {
  const operations = items.reduce((acc, { indexName, indexFieldName, value, id }) => {
    return acc.concat(
      getBulkOperationContainer({ id, indexName }),
      getDoc({ indexFieldName, value })
    );
  }, [] as Array<BulkOperationContainer | Document>);

  return esClient.bulk(
    {
      operations,
      refresh: 'wait_for',
    },
    {
      maxRetries: 0,
    }
  );
};
