/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WrapHits, WrappedSignalHit } from './types';
import { generateId } from './utils';
import { buildBulkBody } from './build_bulk_body';
import { filterDuplicateSignals } from './filter_duplicate_signals';
import type { ConfigType } from '../../../config';
import { CompleteRule, RuleParams } from '../schemas/rule_schemas';

export const wrapHitsFactory =
  ({
    completeRule,
    signalsIndex,
    mergeStrategy,
    ignoreFields,
  }: {
    completeRule: CompleteRule<RuleParams>;
    signalsIndex: string;
    mergeStrategy: ConfigType['alertMergeStrategy'];
    ignoreFields: ConfigType['alertIgnoreFields'];
  }): WrapHits =>
  (events, buildReasonMessage) => {
    const wrappedDocs: WrappedSignalHit[] = events.flatMap((doc) => [
      {
        _index: signalsIndex,
        _id: generateId(doc._index, doc._id, String(doc._version), completeRule.alertId ?? ''),
        _source: buildBulkBody(completeRule, doc, mergeStrategy, ignoreFields, buildReasonMessage),
      },
    ]);

    return filterDuplicateSignals(completeRule.alertId, wrappedDocs, false);
  };
