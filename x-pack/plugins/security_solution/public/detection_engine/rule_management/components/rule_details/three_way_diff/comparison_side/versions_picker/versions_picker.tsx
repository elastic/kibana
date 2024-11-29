/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSelect } from '@elastic/eui';
import type { EuiSelectOption } from '@elastic/eui';
import { BASE_OPTIONS, CURRENT_OPTIONS, TARGET_OPTIONS, SelectedVersions } from './constants';
import * as i18n from './translations';

interface VersionsPickerProps {
  hasBaseVersion: boolean;
  selectedVersions: SelectedVersions;
  onChange: (pickedVersions: SelectedVersions) => void;
}

export function VersionsPicker({
  hasBaseVersion,
  selectedVersions = SelectedVersions.CurrentFinal,
  onChange,
}: VersionsPickerProps) {
  const options: EuiSelectOption[] = useMemo(
    () => [...CURRENT_OPTIONS, ...TARGET_OPTIONS, ...(hasBaseVersion ? BASE_OPTIONS : [])],
    [hasBaseVersion]
  );

  const handleChange = useCallback(
    (changeEvent: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(changeEvent.target.value as SelectedVersions);
    },
    [onChange]
  );

  return (
    <EuiSelect
      options={options}
      value={selectedVersions}
      onChange={handleChange}
      aria-label={i18n.VERSION_PICKER_ARIA_LABEL}
    />
  );
}
