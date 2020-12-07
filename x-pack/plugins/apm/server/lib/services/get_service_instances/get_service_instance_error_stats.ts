/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rangeFilter } from '../../../../common/utils/range_filter';
import { SERVICE_NODE_NAME_MISSING } from '../../../../common/service_nodes';
import {
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { ServiceInstanceParams } from '.';
import { getBucketSize } from '../../helpers/get_bucket_size';

export async function getServiceInstanceErrorStats({
  setup,
  transactionType,
  serviceName,
  size,
}: ServiceInstanceParams) {
  const { apmEventClient, start, end } = setup;

  const { intervalString } = getBucketSize({ start, end });

  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: rangeFilter(start, end) },
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
          ],
        },
      },
      aggs: {
        [SERVICE_NODE_NAME]: {
          terms: {
            field: SERVICE_NODE_NAME,
            missing: SERVICE_NODE_NAME_MISSING,
            size,
          },
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: {
                  min: start,
                  max: end,
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    response.aggregations?.[SERVICE_NODE_NAME].buckets.map(
      (serviceNodeBucket) => ({
        serviceNodeName: String(serviceNodeBucket.key),
        errorCount: {
          value: serviceNodeBucket.doc_count,
          timeseries: serviceNodeBucket.timeseries.buckets.map(
            (dateBucket) => ({
              x: dateBucket.key,
              y: dateBucket.doc_count,
            })
          ),
        },
      })
    ) ?? []
  );
}
