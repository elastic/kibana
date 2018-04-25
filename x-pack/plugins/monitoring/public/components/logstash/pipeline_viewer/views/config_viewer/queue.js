/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel
} from '@elastic/eui';

export const Queue = ({ vertexSelected }) => (
  <li className="queueStatement">
    <div>
      <EuiPanel
        className="statement__content"
        paddingSize="s"
        onClick={vertexSelected}
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <strong>Queue</strong>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  </li>
);
