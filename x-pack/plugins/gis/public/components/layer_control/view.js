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
  EuiPopover
} from '@elastic/eui';
import { LayerTOC } from '../layer_toc';
import { SetView } from '../set_view';

export function LayerControl(props) {
  const addLayer = (
    <EuiButtonEmpty size="xs" flush="right" onClick={props.showAddLayerWizard}>
      Add layer
    </EuiButtonEmpty>);

  const toggleSetViewVisibility = () => {
    if (props.isSetViewOpen) {
      props.closeSetView();
      return;
    }

    props.openSetView();
  };
  const setView = (
    <EuiPopover
      button={(
        <EuiButtonEmpty
          size="xs"
          onClick={toggleSetViewVisibility}
        >
          Set view
        </EuiButtonEmpty>)}
      isOpen={props.isSetViewOpen}
      closePopover={props.closeSetView}
    >
      <SetView />
    </EuiPopover>
  );

  return (
    <EuiPanel className="LayerControl" hasShadow paddingSize="none">
      <EuiFlexGroup
        className="LayerControl--header"
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
        gutterSize="none"
      >
        <EuiFlexItem>
          <EuiTitle size="s">
            <h1>Layers</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {setView}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {addLayer}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem>
          <LayerTOC />
        </EuiFlexItem>
      </EuiFlexGroup>

    </EuiPanel>
  );
}
