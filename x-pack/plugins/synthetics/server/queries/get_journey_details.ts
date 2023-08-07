/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createEsParams, UptimeEsClient } from '../lib';
import { JourneyStep, Ping, SyntheticsJourneyApiResponse } from '../../common/runtime_types';

export interface GetJourneyDetails {
  checkGroup: string;
}

type DocumentSource = (Ping & { '@timestamp': string; synthetics: { type: string } }) | JourneyStep;

export const getJourneyDetails = async ({
  uptimeEsClient,
  checkGroup,
}: GetJourneyDetails & {
  uptimeEsClient: UptimeEsClient;
}): Promise<SyntheticsJourneyApiResponse['details']> => {
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

  const journeyStartHit = thisJourney.hits.hits.find(
    (hit) => hit._source.synthetics?.type === 'journey/start'
  );

  const journeySummaryHit = thisJourney.hits.hits.find(
    ({ _source: summarySource }) => summarySource.synthetics?.type === 'heartbeat/summary'
  );

  const foundJourney = journeyStartHit || journeySummaryHit;

  const journeySource = journeySummaryHit?._source ?? journeyStartHit?._source;

  if (journeySource && foundJourney) {
    const baseSiblingParams = createEsParams({
      body: {
        query: {
          bool: {
            must_not: [
              {
                term: {
                  'monitor.check_group': {
                    value: journeySource.monitor.check_group,
                  },
                },
              },
            ],
            filter: [
              {
                term: {
                  'monitor.id': journeySource.monitor.id,
                },
              },
              {
                term: {
                  'observer.geo.name': journeySource.observer?.geo?.name,
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
        _source: ['@timestamp', 'monitor.check_group'],
        size: 1,
      },
    });

    const previousParams = createEsParams({
      body: {
        ...baseSiblingParams.body,
        query: {
          bool: {
            must_not: baseSiblingParams.body.query.bool.must_not,
            filter: [
              ...baseSiblingParams.body.query.bool.filter,
              {
                range: {
                  '@timestamp': {
                    lt: journeySource['@timestamp'],
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
            must_not: baseSiblingParams.body.query.bool.must_not,
            filter: [
              ...baseSiblingParams.body.query.bool.filter,
              {
                range: {
                  '@timestamp': {
                    gt: journeySource['@timestamp'],
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

    const previousJourney = previousJourneyResult?.hits?.hits?.[0];
    const nextJourney = nextJourneyResult?.hits?.hits?.[0];

    const summaryPing = thisJourney.hits.hits.find(
      ({ _source: summarySource }) => summarySource.synthetics?.type === 'heartbeat/summary'
    )?._source;

    return {
      timestamp: journeySource['@timestamp'],
      journey: { ...journeySource, _id: foundJourney._id },
      ...(summaryPing && 'state' in summaryPing && summaryPing.state
        ? {
            summary: {
              state: summaryPing.state,
            },
          }
        : {}),
      previous: filterNextPrevJourney(journeySource.monitor.check_group, previousJourney?._source),
      next: filterNextPrevJourney(journeySource.monitor.check_group, nextJourney?._source),
    };
  } else {
    return null;
  }
};

const filterNextPrevJourney = (checkGroup: string, pingSource: DocumentSource) => {
  return pingSource && pingSource.monitor.check_group !== checkGroup
    ? {
        checkGroup: pingSource.monitor.check_group,
        timestamp: pingSource['@timestamp'],
      }
    : undefined;
};
