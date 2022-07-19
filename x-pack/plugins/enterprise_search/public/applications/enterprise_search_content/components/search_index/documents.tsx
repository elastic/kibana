/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFieldSearch,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { Result } from '../../../shared/result/result';

const fields = [
  {
    fieldName: 'field1',
    fieldValue: 'value1',
    iconType: 'eye',
  },
  {
    fieldName: 'field1',
    fieldValue: 'value1',
    iconType: 'eye',
  },
  {
    fieldName: 'field1',
    fieldValue: 'value1',
    iconType: 'eye',
  },
  {
    fieldName: 'field1',
    fieldValue: 'value1',
    iconType: 'eye',
  },
  {
    fieldName: 'field1',
    fieldValue: 'value1',
    iconType: 'eye',
  },
];

const onChange = () => {};
export const SearchIndexDocuments: React.FC = () => {
  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2>Browse documents</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldSearch
                placeholder="Search documents in this index"
                isClearable
                onChange={onChange}
                fullWidth
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <Result
            isCheckable
            isDraggable
            actions={[
              {
                color: 'danger',
                iconType: 'arrowDown',
                label: 'action 1',
                onClick: () => {},
              },
            ]}
            fields={fields}
            metaData={{ clickCount: 0, engineId: '123', id: '234', lastUpdated: 'TODAY' }}
          />
          <EuiSpacer size="s" />

          <Result
            actions={[]}
            fields={[
              {
                fieldName: 'field1',
                fieldValue: 'value1',
                iconType: 'eye',
              },
            ]}
            metaData={{ clickCount: 0, engineId: '123', id: '234', lastUpdated: 'TODAY' }}
          />
          <EuiSpacer size="s" />

          <Result
            actions={[]}
            fields={[
              {
                fieldName: 'field1',
                fieldValue: 'value1',
                iconType: 'eye',
              },
            ]}
            metaData={{ clickCount: 0, engineId: '123', id: '234', lastUpdated: 'TODAY' }}
          />
          <EuiSpacer size="s" />

          <Result
            actions={[]}
            fields={[
              {
                fieldName: 'field1',
                fieldValue: 'value1',
                iconType: 'eye',
              },
            ]}
            metaData={{ clickCount: 0, engineId: '123', id: '234', lastUpdated: 'TODAY' }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
