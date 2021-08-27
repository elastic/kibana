/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnwrapPromise } from '@kbn/utility-types';
import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from 'src/core/server';
import { CancellationToken } from '../../../../common';
import { LevelLogger } from '../../../lib';
import { ScrollConfig } from '../../../types';

type SearchResponse = UnwrapPromise<ReturnType<ElasticsearchClient['search']>>;
type SearchRequest = Required<Parameters<ElasticsearchClient['search']>>[0];

function parseResponse(response: SearchResponse) {
  if (!response?.body._scroll_id) {
    throw new Error(
      i18n.translate('xpack.reporting.exportTypes.csv.hitIterator.expectedScrollIdErrorMessage', {
        defaultMessage: 'Expected {scrollId} in the following Elasticsearch response: {response}',
        values: { response: JSON.stringify(response?.body), scrollId: '_scroll_id' },
      })
    );
  }

  if (!response?.body.hits) {
    throw new Error(
      i18n.translate('xpack.reporting.exportTypes.csv.hitIterator.expectedHitsErrorMessage', {
        defaultMessage: 'Expected {hits} in the following Elasticsearch response: {response}',
        values: { response: JSON.stringify(response?.body), hits: 'hits' },
      })
    );
  }

  return {
    scrollId: response.body._scroll_id,
    hits: response.body.hits.hits,
  };
}

export function createHitIterator(logger: LevelLogger) {
  return async function* hitIterator(
    scrollSettings: ScrollConfig,
    elasticsearchClient: ElasticsearchClient,
    searchRequest: SearchRequest,
    cancellationToken: CancellationToken
  ) {
    logger.debug('executing search request');
    async function search(index: SearchRequest['index'], body: SearchRequest['body']) {
      return parseResponse(
        await elasticsearchClient.search({
          index,
          body,
          ignore_unavailable: true, // ignores if the index pattern contains any aliases that point to closed indices
          scroll: scrollSettings.duration,
          size: scrollSettings.size,
        })
      );
    }

    async function scroll(scrollId: string) {
      logger.debug('executing scroll request');
      return parseResponse(
        await elasticsearchClient.scroll({
          body: {
            scroll_id: scrollId,
            scroll: scrollSettings.duration,
          },
        })
      );
    }

    async function clearScroll(scrollId: string | undefined) {
      logger.debug('executing clearScroll request');
      try {
        await elasticsearchClient.clearScroll({
          body: { scroll_id: scrollId },
        });
      } catch (err) {
        // Do not throw the error, as the job can still be completed successfully
        logger.warn('Scroll context can not be cleared!');
        logger.error(err);
      }
    }

    try {
      let { scrollId, hits } = await search(searchRequest.index, searchRequest.body);
      try {
        while (hits && hits.length && !cancellationToken.isCancelled()) {
          for (const hit of hits) {
            yield hit;
          }

          ({ scrollId, hits } = await scroll(scrollId));

          if (cancellationToken.isCancelled()) {
            logger.warn(
              'Any remaining scrolling searches have been cancelled by the cancellation token.'
            );
          }
        }
      } finally {
        await clearScroll(scrollId);
      }
    } catch (err) {
      logger.error(err);
      throw err;
    }
  };
}
