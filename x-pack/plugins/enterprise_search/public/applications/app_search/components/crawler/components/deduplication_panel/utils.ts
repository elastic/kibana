/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSelectableLIOption } from '@elastic/eui/src/components/selectable/selectable_option';

export const getSelectableOptions = (
  availableFields: string[],
  selectedFields: string[],
  showAllFields: boolean,
  deduplicationEnabled: boolean
): Array<EuiSelectableLIOption<object>> => {
  let selectableOptions: Array<EuiSelectableLIOption<object>>;

  if (showAllFields) {
    selectableOptions = availableFields.map((field) => ({
      label: field,
      checked: selectedFields.includes(field) ? 'on' : undefined,
    }));
  } else {
    selectableOptions = availableFields
      .filter((field) => selectedFields.includes(field))
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
