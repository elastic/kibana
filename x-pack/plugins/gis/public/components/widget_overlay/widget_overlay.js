/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { LayerControl } from '../layer_control';
import { ViewControl } from './view_control';

export function WidgetOverlay() {
  return (
    <EuiFlexGroup
      className="gisWidgetOverlay"
      direction="column"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem>
        <LayerControl/>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ViewControl/>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
