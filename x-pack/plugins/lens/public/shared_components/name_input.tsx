/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { DebouncedInput } from './debounced_input';

export const NameInput = ({
  value,
  onChange,
  defaultValue,
}: {
  value: string;
  onChange: (value: string) => void;
  defaultValue?: string;
}) => {
  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.columnLabel', {
        defaultMessage: 'Name',
        description: 'Name of a column of data',
      })}
      display="columnCompressed"
      fullWidth
    >
      <DebouncedInput
        fullWidth
        compressed
        data-test-subj="column-label-edit"
        value={value}
        onChange={onChange}
        defaultValue={defaultValue}
      />
    </EuiFormRow>
  );
};
