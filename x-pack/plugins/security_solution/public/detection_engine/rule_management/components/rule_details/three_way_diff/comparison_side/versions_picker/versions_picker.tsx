/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { isEqual } from 'lodash';
import usePrevious from 'react-use/lib/usePrevious';
import { css } from '@emotion/css';
import { EuiSelect } from '@elastic/eui';
import { getOptionDetails } from '../utils';
import * as i18n from './translations';

export enum VersionsPickerOption {
  MyChanges = 'MY_CHANGES',
  MyOriginalChanges = 'MY_ORIGINAL_CHANGES',
  UpdateFromElastic = 'UPDATE_FROM_ELASTIC',
  Merged = 'MERGED',
}

interface VersionsPickerProps {
  options: VersionsPickerOption[];
  selectedOption: VersionsPickerOption;
  onChange: (selectedOption: VersionsPickerOption) => void;
  resolvedValue: unknown;
  hasResolvedValueDifferentFromSuggested: boolean;
}

export function VersionsPicker({
  options,
  selectedOption,
  onChange,
  resolvedValue,
  hasResolvedValueDifferentFromSuggested,
}: VersionsPickerProps) {
  const euiSelectOptions = options.map((option) => {
    const { title: displayName, description: explanation } = getOptionDetails(
      option,
      hasResolvedValueDifferentFromSuggested
    );

    return {
      value: option,
      text: displayName,
      title: explanation,
    };
  });

  const handleChange = useCallback(
    (changeEvent: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(changeEvent.target.value as VersionsPickerOption);
    },
    [onChange]
  );

  /* Change selected option to "My changes" if user has modified resolved value */
  const prevResolvedValue = usePrevious(resolvedValue);
  useEffect(() => {
    if (
      selectedOption !== VersionsPickerOption.MyChanges &&
      !isEqual(prevResolvedValue, resolvedValue)
    ) {
      onChange(VersionsPickerOption.MyChanges);
    }
  }, [
    hasResolvedValueDifferentFromSuggested,
    onChange,
    selectedOption,
    prevResolvedValue,
    resolvedValue,
  ]);

  return (
    <EuiSelect
      className={VERSIONS_PICKER_STYLES}
      options={euiSelectOptions}
      value={selectedOption}
      onChange={handleChange}
      aria-label={i18n.VERSION_PICKER_ARIA_LABEL}
    />
  );
}

const VERSIONS_PICKER_STYLES = css`
  // Set min-width a bit wider than default
  // to make English text in narrow screens readable
  min-width: 300px;
`;
