/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESFilter } from '@kbn/es-types';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server';
import { Annotation, AnnotationType } from '../../../../common/annotations';
import { AT_TIMESTAMP, SERVICE_NAME, SERVICE_VERSION } from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  getBackwardCompatibleDocumentTypeFilter,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { maybe } from '../../../../common/utils/maybe';

export async function getDerivedServiceAnnotations({
  apmEventClient,
  serviceName,
  environment,
  searchAggregatedTransactions,
  start,
  end,
}: {
  serviceName: string;
  environment: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}) {
  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    ...getBackwardCompatibleDocumentTypeFilter(searchAggregatedTransactions),
    ...environmentQuery(environment),
  ];

  const versions =
    (
      await apmEventClient.search('get_derived_service_annotations', {
        apm: {
          events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
        },
        body: {
          track_total_hits: false,
          size: 0,
          query: {
            bool: {
              filter: [...filter, ...rangeQuery(start, end)],
            },
          },
          aggs: {
            versions: {
              terms: {
                field: SERVICE_VERSION,
              },
            },
          },
        },
      })
    ).aggregations?.versions.buckets.map((bucket) => bucket.key) ?? [];

  if (versions.length <= 1) {
    return [];
  }
  const annotations = await Promise.all(
    versions.map(async (version) => {
      const response = await apmEventClient.search('get_first_seen_of_version', {
        apm: {
          events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
        },
        body: {
          track_total_hits: false,
          size: 1,
          query: {
            bool: {
              filter: [...filter, { term: { [SERVICE_VERSION]: version } }],
            },
          },
          fields: asMutableArray([AT_TIMESTAMP] as const),
          sort: {
            '@timestamp': 'asc',
          },
        },
      });

      const event = unflattenKnownApmEventFields(
        maybe(response.hits.hits[0])?.fields,
        asMutableArray([AT_TIMESTAMP] as const)
      );

      const timestamp = event?.['@timestamp'];
      if (!timestamp) {
        throw new Error('First seen for version was unexpectedly undefined or null.');
      }

      const firstSeen = new Date(timestamp).getTime();

      if (firstSeen < start || firstSeen > end) {
        return null;
      }

      return {
        type: AnnotationType.VERSION,
        id: version,
        '@timestamp': firstSeen,
        text: version,
      };
    })
  );
  return annotations.filter(Boolean) as Annotation[];
}
