/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FocusEventHandler } from 'react';
import { EuiComboBox } from '@elastic/eui';

export interface ESIndexSelectProps {
  loading: boolean;
  value: string;
  indices: string[];
  onChange: (index: string) => void;
  onBlur: FocusEventHandler<HTMLDivElement> | undefined;
  onFocus: FocusEventHandler<HTMLDivElement> | undefined;
}

const defaultIndex = '_all';

export const ESIndexSelect: React.FunctionComponent<ESIndexSelectProps> = ({
  value = defaultIndex,
  loading,
  indices,
  onChange,
  onFocus,
  onBlur,
}) => {
  const selectedOption = value !== defaultIndex ? [{ label: value }] : [];
  const options = indices.map((index) => ({ label: index }));

  return (
    <EuiComboBox
      selectedOptions={selectedOption}
      onChange={([index]) => onChange(index?.label ?? defaultIndex)}
      onSearchChange={(searchValue) => {
        // resets input when user starts typing
        if (searchValue) {
          onChange(defaultIndex);
        }
      }}
      onBlur={onBlur}
      onFocus={onFocus}
      isDisabled={loading}
      options={options}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      onCreateOption={(input) => onChange(input || defaultIndex)}
      compressed
    />
  );
};
