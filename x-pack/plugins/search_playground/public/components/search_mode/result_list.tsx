/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';

const DEMO_DATA = [
  { id: '123321', name: 'John Doe', age: 25 },
  { id: '123321', name: 'John Doe', age: 25 },
  { id: '123321', name: 'John Doe', age: 25 },
  { id: '123321', name: 'John Doe', age: 25 },
  { id: '123321', name: 'John Doe', age: 25 },
  { id: '123321', name: 'John Doe', age: 25 },
  { id: '123321', name: 'John Doe', age: 25 },
  { id: '123321', name: 'John Doe', age: 25 },
  { id: '123321', name: 'John Doe', age: 25 },
  { id: '123321', name: 'John Doe', age: 25 },
];

const hit = {
  flattened: {
    bytes: 123,
    destination: 'Amsterdam',
  },
  id: '1',
  raw: {
    bytes: 123,
    destination: 'Amsterdam',
  },
} as unknown as DataTableRecord;

const hits = [hit];
const dataView = {
  title: 'foo',
  id: 'foo',
  name: 'foo',
  toSpec: () => {},
  toMinimalSpec: () => {},
  isPersisted: () => false,
  fields: {
    getByName: () => {},
    getAll: () => [],
  },
  timeFieldName: 'timestamp',
};

export const ResultList: React.FC = () => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  return (
    <EuiPanel grow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        {DEMO_DATA.map((item, index) => {
          return (
            <>
              <EuiFlexItem key={item.id + '-' + index} onClick={() => setIsFlyoutOpen(true)} grow>
                <EuiFlexGroup direction="column" gutterSize="xs">
                  <EuiFlexItem grow>
                    <EuiTitle size="xs">
                      <h2>{item.id}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow>
                    <EuiText size="s">
                      <p>{item.name}</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              {index !== DEMO_DATA.length - 1 && <EuiHorizontalRule margin="m" />}
            </>
          );
        })}
        {isFlyoutOpen && (
          <UnifiedDocViewerFlyout
            services={{}}
            onClose={() => setIsFlyoutOpen(false)}
            isEsqlQuery={false}
            columns={['column1', 'column2']}
            hit={hit}
            hits={hits}
            dataView={dataView as unknown as DataView}
            onAddColumn={() => {}}
            onRemoveColumn={() => {}}
            setExpandedDoc={() => {}}
            flyoutType="push"
          />
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
