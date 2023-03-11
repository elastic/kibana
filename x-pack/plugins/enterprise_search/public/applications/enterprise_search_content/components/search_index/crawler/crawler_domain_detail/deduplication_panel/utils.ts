/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSelectableLIOption } from '@elastic/eui/src/components/selectable/selectable_option';

import { CrawlerDomain } from '../../../../../api/crawler/types';

export const getSelectableOptions = (
  domain: CrawlerDomain,
  showAllFields: boolean
): Array<EuiSelectableLIOption<object>> => {
  const { availableDeduplicationFields, deduplicationFields, deduplicationEnabled } = domain;

  let selectableOptions: Array<EuiSelectableLIOption<object>>;

  if (showAllFields) {
    selectableOptions = availableDeduplicationFields.map((field) => ({
      label: field,
      checked: deduplicationFields.includes(field) ? 'on' : undefined,
    }));
  } else {
    selectableOptions = availableDeduplicationFields
      .filter((field) => deduplicationFields.includes(field))
      .map((field) => ({ label: field, checked: 'on' }));
  }

  if (!deduplicationEnabled) {
    selectableOptions = selectableOptions.map((option) => ({ ...option, disabled: true }));
  }

  return selectableOptions;
};

export const getCheckedOptionLabels = (options: Array<EuiSelectableLIOption<object>>): string[] => {
  return options.filter((option) => option.checked).map((option) => option.label);
};
