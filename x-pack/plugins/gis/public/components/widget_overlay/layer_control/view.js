/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButtonEmpty,
  EuiTitle,
} from '@elastic/eui';
import { LayerTOC } from './layer_toc';

export function LayerControl(props) {
  const addLayer = (
    <EuiButtonEmpty size="xs" flush="right" onClick={props.showAddLayerWizard}>
      Add layer
    </EuiButtonEmpty>);

  return (
    <EuiPanel className="gisWidgetControl gisWidgetControl-hasShadow" paddingSize="none" grow={false}>
      <EuiFlexItem className="gisWidgetControl__header" grow={false}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          gutterSize="none"
        >
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>Layers</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {addLayer}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem className="gisLayerControl">
        <LayerTOC />
      </EuiFlexItem>
    </EuiPanel>
  );
}
