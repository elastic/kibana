/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { ESFilter } from '../../../../../../../src/core/types/elasticsearch';
import { Annotation, AnnotationType } from '../../../../common/annotations';
import {
  SERVICE_NAME,
  SERVICE_VERSION,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { Setup } from '../../../lib/helpers/setup_request';

export async function getDerivedServiceAnnotations({
  setup,
  serviceName,
  environment,
  searchAggregatedTransactions,
  serviceVersionPerServiceNode,
  start,
  end,
}: {
  serviceName: string;
  environment: string;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  serviceVersionPerServiceNode: boolean;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    ...getDocumentTypeFilterForTransactions(searchAggregatedTransactions),
    ...environmentQuery(environment),
  ];

  const versions =
    (
      await apmEventClient.search('get_derived_service_annotations', {
        apm: {
          events: [
            getProcessorEventForTransactions(searchAggregatedTransactions),
          ],
        },
        body: {
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
    ).aggregations?.versions.buckets.map((bucket) => bucket.key as string) ?? [];

  if (versions.length <= 1) {
    return [];
  }
  const annotations = await Promise.all(
    versions.map((version) =>
      serviceVersionPerServiceNode
        ? getFirstSeenVersionByServiceNode(
            version,
            apmEventClient,
            start,
            end,
            filter,
            searchAggregatedTransactions
          )
        : getFirstSeenVersion(
            version,
            apmEventClient,
            start,
            end,
            filter,
            searchAggregatedTransactions
          )
    )
  );
  return annotations.flat().filter(Boolean) as Annotation[];
}

async function getFirstSeenVersion(
  version: string,
  apmEventClient,
  start: number,
  end: number,
  filter: ESFilter[],
  searchAggregatedTransactions: boolean
) {
  const response = await apmEventClient.search('get_first_seen_of_version', {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
      ],
    },
    body: {
      size: 1,
      query: {
        bool: {
          filter: [...filter, { term: { [SERVICE_VERSION]: version } }],
        },
      },
      sort: {
        '@timestamp': 'asc',
      },
    },
  });

  const firstSeen = new Date(
    response.hits.hits[0]._source['@timestamp']
  ).getTime();

  if (!isFiniteNumber(firstSeen)) {
    throw new Error(
      'First seen for version was unexpectedly undefined or null.'
    );
  }

  if (firstSeen < start || firstSeen > end) {
    return [];
  }

  return [
    {
      type: AnnotationType.VERSION,
      id: version,
      '@timestamp': firstSeen,
      text: version,
    },
  ];
}

async function getFirstSeenVersionByServiceNode(
  version: string,
  apmEventClient,
  start: number,
  end: number,
  filter: ESFilter[],
  searchAggregatedTransactions: boolean
) {
  const response = await apmEventClient.search('get_first_seen_of_version_by_service_node', {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [...filter, { term: { [SERVICE_VERSION]: version } }],
        },
      },
      aggs: {
        nodes: {
          terms: {
            field: 'service.node.name',
          },
          aggs: {
            first_seen: {
              min: {
                field: '@timestamp',
              },
            },
          },
        },
      },
    },
  });

  return response.aggregations?.nodes.buckets.map((bucket) => {
    const firstSeen = bucket.first_seen.value;

    if (!isFiniteNumber(firstSeen)) {
      throw new Error(
        'First seen for version was unexpectedly undefined or null.'
      );
    }

    if (firstSeen < start || firstSeen > end) {
      return null;
    }

    return {
      type: AnnotationType.VERSION,
      id: version + '_' + bucket.key,
      '@timestamp': firstSeen,
      text: version + ' (' + bucket.key + ')',
    };
  });
}
