/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UMElasticsearchQueryFn } from '../adapters/framework';
import { SyntheticsJourneyApiResponse } from '../../../common/runtime_types';

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
            term: {
              'synthetics.type': 'journey/end',
            },
          },
        ],
      },
    },
    size: 1,
  };

  const { body: thisJourney } = await uptimeEsClient.search({ body: baseParams });

  if (thisJourney?.hits?.hits.length > 0) {
    const thisJourneySource: any = thisJourney.hits.hits[0]._source;

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
                'synthetics.type': 'journey/end',
              },
            },
          ],
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
      sort: [{ '@timestamp': { order: 'desc' } }],
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
      sort: [{ '@timestamp': { order: 'asc' } }],
    };

    const { body: previousJourneyResult } = await uptimeEsClient.search({ body: previousParams });
    const { body: nextJourneyResult } = await uptimeEsClient.search({ body: nextParams });
    const previousJourney: any =
      previousJourneyResult?.hits?.hits.length > 0 ? previousJourneyResult?.hits?.hits[0] : null;
    const nextJourney: any =
      nextJourneyResult?.hits?.hits.length > 0 ? nextJourneyResult?.hits?.hits[0] : null;
    return {
      timestamp: thisJourneySource['@timestamp'],
      journey: thisJourneySource,
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
