/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TechnicalRuleFieldMaps } from '../../../../../../rule_registry/common/assets/field_maps/technical_rule_field_map';
import type { ConfigType } from '../../../../config';
import { buildBulkBody } from '../../signals/build_bulk_body';
import { filterDuplicateSignals } from '../../signals/filter_duplicate_signals';
import { SearchAfterAndBulkCreateParams } from '../../signals/types';
import { generateId } from '../../signals/utils';

export const wrapHitsFactory = ({
  ruleSO,
  signalsIndex,
  mergeStrategy,
}: {
  ruleSO: SearchAfterAndBulkCreateParams['ruleSO'];
  signalsIndex: string;
  mergeStrategy: ConfigType['alertMergeStrategy'];
}) => (events) => {
  const wrappedDocs: TechnicalRuleFieldMaps[] = events.flatMap((doc) => [
    {
      _index: signalsIndex,
      _id: generateId(
        doc._index,
        doc._id,
        String(doc._version),
        ruleSO.attributes.params.ruleId ?? ''
      ),
      _source: buildBulkBody(ruleSO, doc, mergeStrategy),
    },
  ]);

  // return filterDuplicateSignals(ruleSO.id, wrappedDocs, false);
  return wrappedDocs;
};
