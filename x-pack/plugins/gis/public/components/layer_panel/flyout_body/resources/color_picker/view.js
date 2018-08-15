/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiColorPicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiKeyboardAccessible,
} from '@elastic/eui';

export function ColorPicker({ currentColor, changeColor, resetColor,
  active = true }) {
  return active && (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiColorPicker
          onChange={changeColor}
          color={currentColor}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <p className="kuiText">
          <EuiKeyboardAccessible>
            <a className="kuiLink" onClick={resetColor}>
              Reset
            </a>
          </EuiKeyboardAccessible>
        </p>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}