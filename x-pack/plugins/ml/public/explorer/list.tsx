/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiListGroup,
  // This isn't part of EUI's type definitions yet.
  // @ts-ignore
  EuiListGroupItem,
} from '@elastic/eui';

import { Dictionary } from '../../common/types/common';

interface OptionsDataElement {
  agg: string;
  field: string;
  formRowLabel: string;
}

interface ListProps {
  list: string[];
  optionsData: Dictionary<OptionsDataElement>;
  deleteHandler(l: string): void;
}

export const List: React.SFC<ListProps> = ({ deleteHandler, list, optionsData }) => (
  <EuiListGroup>
    {list.map((l: string) => (
      <EuiListGroupItem
        key={l}
        id={`walterra-item-${l}`}
        label={
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow label="Custom name">
                <EuiFieldText defaultValue={optionsData[l].formRowLabel} />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="Aggregation">
                <EuiFieldText defaultValue={optionsData[l].agg} />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="Field">
                <EuiFieldText defaultValue={optionsData[l].field} />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        isActive
        extraAction={{
          color: 'subdued',
          onClick: () => deleteHandler(l),
          iconType: 'cross',
          iconSize: 's',
          'aria-label': l,
          alwaysShow: false,
        }}
      />
    ))}
  </EuiListGroup>
);
