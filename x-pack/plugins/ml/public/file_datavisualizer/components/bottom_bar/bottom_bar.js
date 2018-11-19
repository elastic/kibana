/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBottomBar,
} from '@elastic/eui';

import { MODE as DATAVISUALIZER_MODE } from '../file_datavisualizer_view';

export function BottomBar({ showBar, mode, changeMode, onCancel }) {
  if (showBar) {
    if (mode === DATAVISUALIZER_MODE.READ) {
      return (
        <EuiBottomBar >
          <EuiFlexGroup >
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={() => changeMode(DATAVISUALIZER_MODE.IMPORT)}
              >
                Import
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="ghost"
                onClick={() => onCancel()}
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>

        </EuiBottomBar>
      );
    } else {
      return (
        <EuiBottomBar >
          <EuiFlexGroup >
            <EuiFlexItem grow={false}>
              <EuiButton
                color="ghost"
                onClick={() => changeMode(DATAVISUALIZER_MODE.READ)}
              >
                Back
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="ghost"
                onClick={() => onCancel()}
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      );
    }
  }
  return null;
}
