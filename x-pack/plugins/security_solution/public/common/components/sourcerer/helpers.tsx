/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBoxOptionOption, EuiIcon, EuiHighlight } from '@elastic/eui';
import { SourcererPatternType } from '../../../../common/search_strategy/index_fields';

export const renderPatternOption = (
  { value, label }: EuiComboBoxOptionOption<string>,
  searchValue: string
) =>
  value !== SourcererPatternType.config && value !== SourcererPatternType.detections ? (
    <span data-test-subj="kip-option">
      <EuiIcon type="logoKibana" size="s" />{' '}
      <EuiHighlight search={searchValue}>{label}</EuiHighlight>
    </span>
  ) : (
    <span data-test-subj="config-option">
      <EuiHighlight search={searchValue}>{label}</EuiHighlight>
    </span>
  );

export const filterKipAsSoloPattern = (
  selectedOptions: Array<EuiComboBoxOptionOption<string>>,
  newSelectedOptions: Array<EuiComboBoxOptionOption<string>>
): Array<EuiComboBoxOptionOption<string>> => {
  const currentKip = selectedOptions.find(
    ({ value }) =>
      value !== SourcererPatternType.config && value !== SourcererPatternType.detections
  );
  const filterKibanaIndexPattern = newSelectedOptions.filter(
    ({ value }) =>
      value !== SourcererPatternType.config && value !== SourcererPatternType.detections
  );
  if (currentKip && filterKibanaIndexPattern.length > 0) {
    if (filterKibanaIndexPattern.length > 1) {
      const newKip = filterKibanaIndexPattern.find(({ value }) => value !== currentKip.value);
      if (newKip) {
        return [newKip];
      }
    }
    const filterOutCurrentKip = newSelectedOptions.filter(
      ({ value }) =>
        value !== currentKip.value ||
        value === SourcererPatternType.config ||
        value === SourcererPatternType.detections
    );
    if (filterOutCurrentKip.length > 0) {
      return filterOutCurrentKip;
    }
  }
  if (filterKibanaIndexPattern.length > 0) {
    return filterKibanaIndexPattern;
  }
  if (currentKip) {
    const removeKibanaIndexPattern = newSelectedOptions.filter(
      ({ value }) =>
        value === SourcererPatternType.config || value === SourcererPatternType.detections
    );
    if (removeKibanaIndexPattern.length > 0) {
      return removeKibanaIndexPattern;
    }
  }
  return newSelectedOptions;
};
