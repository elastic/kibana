/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MBMapContainer } from '../map/mb';
import { LayerControl } from '../layer_control/index';
import { LayerPanel } from '../layer_panel/index';
import { AddLayerPanel } from '../layer_addpanel/index';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Toasts } from '../toasts';


export function GISApp(props) {
  const {
    layerDetailsVisible,
    addLayerVisible,
    noFlyoutVisible
  } = props;

  let currentPanel;
  let currentPanelClassName;

  if (noFlyoutVisible) {
    currentPanel = null;
  } else if (addLayerVisible) {
    currentPanelClassName = "gisLayerPanel-isVisible";
    currentPanel = <AddLayerPanel/>;
  } else if (layerDetailsVisible) {
    currentPanelClassName = "gisLayerPanel-isVisible";
    currentPanel = (
      <LayerPanel
        removeLayer={() => console.warn('removeLayer not implemented.')}
      />
    );
  }
  return (
    <EuiFlexGroup className="wrapper" gutterSize="none">
      <EuiFlexItem className="gisMapWrapper">
        <MBMapContainer/>
        <LayerControl/>
      </EuiFlexItem>

      <EuiFlexItem
        className={`gisLayerPanel ${currentPanelClassName}`}
        grow={false}
      >
        {currentPanel}
      </EuiFlexItem>
      <Toasts/>
    </EuiFlexGroup>
  );
}
