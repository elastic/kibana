/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { JourneyStep, Ping, SyntheticsJourneyApiResponse } from '../../common/runtime_types';
import { UMElasticsearchQueryFn } from '../legacy_uptime/lib/adapters';

export interface GetJourneyDetails {
  checkGroup: string;
}

export const getJourneyDetails: UMElasticsearchQueryFn<
  GetJourneyDetails,
  SyntheticsJourneyApiResponse['details']
> = async ({ uptimeEsClient, checkGroup }) => {
  const baseParams = {
    query: {
      bool: {
        filter: [
          {
            term: {
              'monitor.check_group': checkGroup,
            },
          },
          {
            terms: {
              'synthetics.type': ['journey/start', 'heartbeat/summary'],
            },
          },
        ] as QueryDslQueryContainer[],
      },
    },
    size: 2,
  };

  const { body: thisJourney } = await uptimeEsClient.search(
    { body: baseParams },
    'getJourneyDetailsCurrentJourney'
  );

  if (thisJourney.hits.hits.length > 0) {
    const { _id, _source } = thisJourney.hits.hits[0];
    const thisJourneySource = Object.assign({ _id }, _source) as JourneyStep;

    const baseSiblingParams = {
      query: {
        bool: {
          filter: [
            {
              term: {
                'monitor.id': thisJourneySource.monitor.id,
              },
            },
            {
              term: {
                'synthetics.type': 'journey/start',
              },
            },
          ] as QueryDslQueryContainer[],
        },
      },
      _source: ['@timestamp', 'monitor.check_group'],
      size: 1,
    };

    const previousParams = {
      ...baseSiblingParams,
      query: {
        bool: {
          filter: [
            ...baseSiblingParams.query.bool.filter,
            {
              range: {
                '@timestamp': {
                  lt: thisJourneySource['@timestamp'],
                },
              },
            },
          ],
        },
      },
      sort: [{ '@timestamp': { order: 'desc' as const } }],
    };

    const nextParams = {
      ...baseSiblingParams,
      query: {
        bool: {
          filter: [
            ...baseSiblingParams.query.bool.filter,
            {
              range: {
                '@timestamp': {
                  gt: thisJourneySource['@timestamp'],
                },
              },
            },
          ],
        },
      },
      sort: [{ '@timestamp': { order: 'asc' as const } }],
    };

    const [previousJourneyPromise, nextJourneyPromise] = await Promise.all([
      uptimeEsClient.search({ body: previousParams }, 'getJourneyDetailsNextJourney'),
      uptimeEsClient.search({ body: nextParams }, 'getJourneyDetailsPreviousJourney'),
    ]);

    const { body: previousJourneyResult } = previousJourneyPromise;
    const { body: nextJourneyResult } = nextJourneyPromise;

    const previousJourney: any =
      previousJourneyResult?.hits?.hits.length > 0 ? previousJourneyResult?.hits?.hits[0] : null;
    const nextJourney: any =
      nextJourneyResult?.hits?.hits.length > 0 ? nextJourneyResult?.hits?.hits[0] : null;

    const summaryPing = thisJourney.hits.hits.find(
      ({ _source: summarySource }) =>
        (summarySource as Ping).synthetics?.type === 'heartbeat/summary'
    ) as { _source: Ping };

    return {
      timestamp: thisJourneySource['@timestamp'],
      journey: thisJourneySource,
      summary: summaryPing
        ? {
            state: summaryPing._source.state,
          }
        : undefined,
      previous: previousJourney
        ? {
            checkGroup: previousJourney._source.monitor.check_group,
            timestamp: previousJourney._source['@timestamp'],
          }
        : undefined,
      next: nextJourney
        ? {
            checkGroup: nextJourney._source.monitor.check_group,
            timestamp: nextJourney._source['@timestamp'],
          }
        : undefined,
    } as SyntheticsJourneyApiResponse['details'];
  } else {
    return null;
  }
};
