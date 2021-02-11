/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiComboBoxOptionOption,
  EuiHealth,
  EuiHighlight,
  euiPaletteColorBlindBehindText,
} from '@elastic/eui';
import styled from 'styled-components';
import {
  SelectablePatternId,
  SourcererPatternType,
} from '../../../../common/search_strategy/index_fields';
const visColorsBehindText = euiPaletteColorBlindBehindText();

export const patternColors = {
  kip: visColorsBehindText[0], // green
  detections: visColorsBehindText[7], // orangey brown
};

export const getPatternColor = (patternType: SelectablePatternId) => {
  switch (patternType) {
    case SourcererPatternType.detections:
      return patternColors.detections;
    case SourcererPatternType.config:
      return undefined; // undefined for white
    default:
      return patternColors.kip;
  }
};

export const OutlineEuiHealth = styled(EuiHealth)`
  // margin + width/height + margin; 4 + 8 + 4 = 16; size of .euiIcon--medium
  svg.euiIcon--medium {
    width: 8px;
    height: 8px;
    margin: 4px;
    background: ${(props) => props.theme.eui.euiColorMediumShade};
    border-radius: 50%;
  }
  circle {
    r: 7;
  }
`;
export const renderPatternOption = (
  { value, label }: EuiComboBoxOptionOption<string>,
  searchValue: string
) => {
  const dotColor = value ? getPatternColor(value) : value;
  return dotColor ? (
    <EuiHealth color={dotColor}>
      <EuiHighlight search={searchValue}>{label}</EuiHighlight>
    </EuiHealth>
  ) : (
    <OutlineEuiHealth color={'ghost'}>
      <EuiHighlight search={searchValue}>{label}</EuiHighlight>
    </OutlineEuiHealth>
  );
};
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
