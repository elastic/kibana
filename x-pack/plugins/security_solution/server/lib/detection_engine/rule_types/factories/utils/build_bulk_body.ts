/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP } from '@kbn/rule-data-utils';
import { SavedObject } from 'src/core/types';
import { BaseHit } from '../../../../../../common/detection_engine/types';
import type { ConfigType } from '../../../../../config';
import { buildRuleWithOverrides, buildRuleWithoutOverrides } from '../../../signals/build_rule';
import { BuildReasonMessage } from '../../../signals/reason_formatters';
import { getMergeStrategy } from '../../../signals/source_fields_merging/strategies';
import { AlertAttributes, SignalSource, SignalSourceHit, SimpleHit } from '../../../signals/types';
import { RACAlert } from '../../types';
import { additionalAlertFields, buildAlert } from './build_alert';
import { filterSource } from './filter_source';

const isSourceDoc = (
  hit: SignalSourceHit
): hit is BaseHit<{ '@timestamp': string; _source: SignalSource }> => {
  return hit._source != null;
};

/**
 * Formats the search_after result for insertion into the signals index. We first create a
 * "best effort" merged "fields" with the "_source" object, then build the signal object,
 * then the event object, and finally we strip away any additional temporary data that was added
 * such as the "threshold_result".
 * @param ruleSO The rule saved object to build overrides
 * @param doc The SignalSourceHit with "_source", "fields", and additional data such as "threshold_result"
 * @returns The body that can be added to a bulk call for inserting the signal.
 */
export const buildBulkBody = (
  spaceId: string | null | undefined,
  ruleSO: SavedObject<AlertAttributes>,
  doc: SimpleHit,
  mergeStrategy: ConfigType['alertMergeStrategy'],
  ignoreFields: ConfigType['alertIgnoreFields'],
  applyOverrides: boolean,
  buildReasonMessage: BuildReasonMessage
): RACAlert => {
  const mergedDoc = getMergeStrategy(mergeStrategy)({ doc, ignoreFields });
  const rule = applyOverrides
    ? buildRuleWithOverrides(ruleSO, mergedDoc._source ?? {})
    : buildRuleWithoutOverrides(ruleSO);
  const filteredSource = filterSource(mergedDoc);
  const timestamp = new Date().toISOString();

  const reason = buildReasonMessage({ mergedDoc, rule });
  if (isSourceDoc(mergedDoc)) {
    return {
      ...filteredSource,
      ...buildAlert([mergedDoc], rule, spaceId, reason),
      ...additionalAlertFields(mergedDoc),
      [TIMESTAMP]: timestamp,
    };
  }

  throw Error('Error building alert from source document.');
};
