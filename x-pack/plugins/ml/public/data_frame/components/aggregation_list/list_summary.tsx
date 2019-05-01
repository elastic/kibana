/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiForm, EuiFormRow } from '@elastic/eui';

import { AggName, PivotAggsConfigDict } from '../../common';

interface ListProps {
  list: PivotAggsConfigDict;
  deleteHandler?(l: string): void;
}

export const AggListSummary: React.SFC<ListProps> = ({ list }) => {
  const listKeys = Object.keys(list);
  return (
    <EuiForm>
      {listKeys.map((l: AggName) => (
        <EuiFormRow key={l} label={list[l].aggName}>
          <span>{l}</span>
        </EuiFormRow>
      ))}
    </EuiForm>
  );
};
