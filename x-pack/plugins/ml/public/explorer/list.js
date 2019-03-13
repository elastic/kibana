/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';

export const List = ({ deleteHandler, list, optionsData }) => (
  <EuiListGroup style={{ maxWidth: '640px', padding: 0 }}>
    {list.map((l) => (
      <EuiListGroupItem
        key={l}
        id={`walterra-item-${l}`}
        label={(
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow label="Custom name">
                <EuiFieldText defaultValue={optionsData[l].formRowLabel}/>
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="Aggregation">
                <EuiFieldText defaultValue={optionsData[l].agg}/>
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="Field">
                <EuiFieldText defaultValue={optionsData[l].field} />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
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
