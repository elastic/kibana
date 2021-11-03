/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FocusEventHandler } from 'react';
import { EuiComboBox } from '@elastic/eui';

export interface ESFieldSelectProps {
  index: string;
  value: string;
  onChange: (field: string | null) => void;
  onBlur: FocusEventHandler<HTMLDivElement> | undefined;
  onFocus: FocusEventHandler<HTMLDivElement> | undefined;
  fields: string[];
}

export const ESFieldSelect: React.FunctionComponent<ESFieldSelectProps> = ({
  value,
  fields = [],
  onChange,
  onFocus,
  onBlur,
}) => {
  const selectedOption = value ? [{ label: value }] : [];
  const options = fields.map((field) => ({ label: field }));
  return (
    <EuiComboBox
      selectedOptions={selectedOption}
      options={options}
      onChange={([field]) => onChange(field?.label ?? null)}
      onSearchChange={(searchValue) => {
        // resets input when user starts typing
        if (searchValue) {
          onChange(null);
        }
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      compressed
    />
  );
};
