/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataViewId,
  IndexPatternArray,
} from '../../../../../../../common/detection_engine/rule_schema';
import type { RuleDataSource } from '../../../../../../../common/detection_engine/prebuilt_rules/model/diff/diffable_rule/diffable_field_types';
import { DataSourceType } from '../../../../../../../common/detection_engine/prebuilt_rules/model/diff/diffable_rule/diffable_field_types';

export const extractRuleDataSource = (
  indexPatterns: IndexPatternArray | undefined,
  dataViewId: DataViewId | undefined
): RuleDataSource | undefined => {
  if (indexPatterns != null) {
    return {
      type: DataSourceType.index_patterns,
      index_patterns: indexPatterns,
    };
  }

  if (dataViewId != null) {
    return {
      type: DataSourceType.data_view,
      data_view_id: dataViewId,
    };
  }

  return undefined;
};
