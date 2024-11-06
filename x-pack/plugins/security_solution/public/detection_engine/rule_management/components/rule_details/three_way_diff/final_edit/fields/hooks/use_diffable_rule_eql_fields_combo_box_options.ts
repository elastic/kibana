/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EqlFieldsComboBoxOptions } from '@kbn/timelines-plugin/common';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { useDiffableRuleDataView } from './use_diffable_rule_data_view';

export function useDiffableRuleEqlFieldsComboBoxOptions(
  diffableRule: DiffableRule
): EqlFieldsComboBoxOptions {
  const { dataView } = useDiffableRuleDataView(diffableRule);

  return useMemo(
    () =>
      !dataView
        ? {
            keywordFields: [],
            dateFields: [],
            nonDateFields: [],
          }
        : {
            keywordFields: dataView.fields
              .filter((f) => f.esTypes?.includes('keyword'))
              .map((f) => ({ label: f.name })),
            dateFields: dataView.fields
              .filter((f) => f.type === 'date')
              .map((f) => ({ label: f.name })),
            nonDateFields: dataView.fields
              .filter((f) => f.type !== 'date')
              .map((f) => ({ label: f.name })),
          },
    [dataView]
  );
}
