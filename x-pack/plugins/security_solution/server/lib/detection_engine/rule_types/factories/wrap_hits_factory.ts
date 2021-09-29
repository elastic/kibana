/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';
import { Logger } from 'kibana/server';

import type { ConfigType } from '../../../../config';
import { filterDuplicateSignals } from '../../signals/filter_duplicate_signals';
import { SearchAfterAndBulkCreateParams, SimpleHit, WrapHits } from '../../signals/types';
import { generateId } from '../../signals/utils';
import { buildBulkBody } from './utils/build_bulk_body';

export const wrapHitsFactory =
  ({
    logger,
    ignoreFields,
    mergeStrategy,
    ruleSO,
    spaceId,
  }: {
    logger: Logger;
    ruleSO: SearchAfterAndBulkCreateParams['ruleSO'];
    mergeStrategy: ConfigType['alertMergeStrategy'];
    ignoreFields: ConfigType['alertIgnoreFields'];
    spaceId: string | null | undefined;
  }): WrapHits =>
  (events, buildReasonMessage) => {
    try {
      const wrappedDocs = events.map((event) => {
        const id = generateId(
          event._index,
          event._id,
          String(event._version),
          `${spaceId}:${ruleSO.id}`
        );
        return {
          _id: id,
          _index: '',
          _source: {
            ...buildBulkBody(
              spaceId,
              ruleSO,
              event as SimpleHit,
              mergeStrategy,
              ignoreFields,
              true,
              buildReasonMessage
            ),
            [ALERT_UUID]: id,
          },
        };
      });

      return filterDuplicateSignals(ruleSO.id, wrappedDocs, true);
    } catch (error) {
      logger.error(error);
      return [];
    }
  };
