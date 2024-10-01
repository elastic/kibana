/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { compact } from 'lodash';
import { mapToSingleOrMultiValue } from '@kbn/apm-data-access-plugin/server';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { maybe } from '../../../../common/utils/maybe';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { filterOptionsRt } from './custom_link_types';
import { splitFilterValueByComma } from './helper';

export type FlattenedTransaction = Partial<{
  [key: string]: unknown;
}>;

export async function getTransaction({
  apmEventClient,
  filters = {},
}: {
  apmEventClient: APMEventClient;
  filters?: t.TypeOf<typeof filterOptionsRt>;
}): Promise<FlattenedTransaction | undefined> {
  const esFilters = compact(
    Object.entries(filters)
      // loops through the filters splitting the value by comma and removing white spaces
      .map(([key, value]) => {
        if (value) {
          return { terms: { [key]: splitFilterValueByComma(value) } };
        }
      })
  );

  const resp = await apmEventClient.search('get_transaction_for_custom_link', {
    terminate_after: 1,
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.TransactionEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    body: {
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          filter: esFilters,
        },
      },
      fields: ['*'],
    },
  });

  const event = maybe(resp.hits.hits[0])?.fields;
  return event ? mapToSingleOrMultiValue(event) : undefined;
}
