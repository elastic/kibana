/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { JourneyStep, Ping, SyntheticsJourneyApiResponse } from '../../common/runtime_types';
import { UMElasticsearchQueryFn } from '../legacy_uptime/lib/adapters';
import { createEsParams } from '../legacy_uptime/lib/lib';

export interface GetJourneyDetails {
  checkGroup: string;
}

type DocumentSource = (Ping & { '@timestamp': string }) | JourneyStep;

export const getJourneyDetails: UMElasticsearchQueryFn<
  GetJourneyDetails,
  SyntheticsJourneyApiResponse['details']
> = async ({ uptimeEsClient, checkGroup }) => {
  const params = createEsParams({
    body: {
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
          ],
        },
      },
      size: 2,
    },
  });

  const { body: thisJourney } = await uptimeEsClient.search<DocumentSource, typeof params>(
    params,
    'getJourneyDetailsCurrentJourney'
  );

  const journeyStart = thisJourney.hits.hits.find(
    (hit) => hit._source.synthetics?.type === 'journey/start'
  );

  if (journeyStart) {
    const { _id, _source } = journeyStart;
    const thisJourneySource = Object.assign({ _id }, _source) as JourneyStep;

    const baseSiblingParams = createEsParams({
      body: {
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
                  'observer.geo.name': thisJourneySource.observer?.geo?.name,
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
      },
    });

    const previousParams = createEsParams({
      body: {
        ...baseSiblingParams.body,
        query: {
          bool: {
            filter: [
              ...baseSiblingParams.body.query.bool.filter,
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
      },
    });

    const nextParams = createEsParams({
      body: {
        ...baseSiblingParams.body,
        query: {
          bool: {
            filter: [
              ...baseSiblingParams.body.query.bool.filter,
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
      },
    });

    const [previousJourneyPromise, nextJourneyPromise] = await Promise.all([
      uptimeEsClient.search<JourneyStep, typeof previousParams>(
        previousParams,
        'getJourneyDetailsPreviousJourney'
      ),
      uptimeEsClient.search<JourneyStep, typeof nextParams>(
        nextParams,
        'getJourneyDetailsNextJourney'
      ),
    ]);

    const { body: previousJourneyResult } = previousJourneyPromise;
    const { body: nextJourneyResult } = nextJourneyPromise;

    const previousJourney =
      previousJourneyResult?.hits?.hits.length > 0 ? previousJourneyResult?.hits?.hits[0] : null;
    const nextJourney =
      nextJourneyResult?.hits?.hits.length > 0 ? nextJourneyResult?.hits?.hits[0] : null;

    const summaryPing = thisJourney.hits.hits.find(
      ({ _source: summarySource }) => summarySource.synthetics?.type === 'heartbeat/summary'
    )?._source;

    return {
      timestamp: thisJourneySource['@timestamp'],
      journey: thisJourneySource,
      ...(summaryPing && 'state' in summaryPing && summaryPing.state
        ? {
            summary: {
              state: summaryPing.state,
            },
          }
        : {}),
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
    };
  } else {
    return null;
  }
};
