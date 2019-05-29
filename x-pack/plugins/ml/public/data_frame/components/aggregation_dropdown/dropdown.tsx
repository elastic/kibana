/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';

interface Props {
  options: EuiComboBoxOptionProps[];
  placeholder?: string;
  changeHandler(d: EuiComboBoxOptionProps[]): void;
}

export const DropDown: React.SFC<Props> = ({
  changeHandler,
  options,
  placeholder = 'Search ...',
}) => {
  return (
    <EuiComboBox
      placeholder={placeholder}
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={[]}
      onChange={changeHandler}
      isClearable={false}
    />
  );
};
