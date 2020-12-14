/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFieldSearch } from '@elastic/eui';

interface Props {
  inputProps: {
    placeholder: string;
    'aria-label': string;
    'data-test-subj': string;
  };
  value: string;
  onChange(value: string): void;
}

export const SearchBoxView: React.FC<Props> = ({ onChange, value, inputProps }) => {
  return (
    <EuiFieldSearch
      value={value}
      onChange={(event) => onChange(event.target.value)}
      fullWidth={true}
      {...inputProps}
    />
  );
};
