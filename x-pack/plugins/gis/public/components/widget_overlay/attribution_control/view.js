/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButtonEmpty,
  EuiPopover,
  EuiText,
} from '@elastic/eui';

export function AttributionControl({ layerList }) {

  console.log('attr control', layerList);

  return (
    <EuiPanel className="gisWidgetControl" hasShadow paddingSize="s">
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          Blraf!
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
