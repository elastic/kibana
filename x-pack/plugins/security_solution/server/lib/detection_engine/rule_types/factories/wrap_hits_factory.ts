/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
        return {
          _index: '',
          _id: generateId(
            event._index,
            event._id,
            String(event._version),
            ruleSO.attributes.params.ruleId ?? ''
          ),
          _source: buildBulkBody(
            spaceId,
            ruleSO,
            event as SimpleHit,
            mergeStrategy,
            ignoreFields,
            true,
            buildReasonMessage
          ),
        };
      });

      return filterDuplicateSignals(ruleSO.id, wrappedDocs, true);
    } catch (error) {
      logger.error(error);
      return [];
    }
  };
