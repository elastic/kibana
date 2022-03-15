/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { useDebouncedValue } from '../shared_components';

export const NameInput = ({
  value,
  onChange,
  defaultValue,
}: {
  value: string;
  onChange: (value: string) => void;
  defaultValue?: string;
}) => {
  const { inputValue, handleInputChange, initialValue } = useDebouncedValue({
    onChange,
    value,
    defaultValue,
  });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.columnLabel', {
        defaultMessage: 'Name',
        description: 'Name of a column of data',
      })}
      display="columnCompressed"
      fullWidth
    >
      <EuiFieldText
        compressed
        data-test-subj="indexPattern-label-edit"
        value={inputValue}
        onChange={(e) => {
          handleInputChange(e.target.value);
        }}
        placeholder={initialValue}
      />
    </EuiFormRow>
  );
};
