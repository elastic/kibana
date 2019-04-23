/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiForm, EuiFormRow } from '@elastic/eui';

import { Dictionary } from '../../../../common/types/common';

interface OptionsDataElement {
  agg: string;
  field: string;
  formRowLabel: string;
}

interface ListProps {
  list: string[];
  optionsData: Dictionary<OptionsDataElement>;
  deleteHandler?(l: string): void;
}

export const AggListSummary: React.SFC<ListProps> = ({ list, optionsData }) => (
  <EuiForm>
    {list.map((l: string) => (
      <EuiFormRow key={l} label={optionsData[l].formRowLabel}>
        <span>{l}</span>
      </EuiFormRow>
    ))}
  </EuiForm>
);
