/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';

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

export const ResultList: React.FC = () => {
  return (
    <EuiPanel grow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        {DEMO_DATA.map((item, index) => {
          return (
            <>
              <EuiFlexItem key={item.id + '-' + index} grow>
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
      </EuiFlexGroup>
    </EuiPanel>
  );
};
