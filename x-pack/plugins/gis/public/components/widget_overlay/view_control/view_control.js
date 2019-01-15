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
  EuiButton,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { SetView } from './set_view';

export function ViewControl({ isSetViewOpen, closeSetView, openSetView, mouseCoordinates }) {
  const toggleSetViewVisibility = () => {
    if (isSetViewOpen) {
      closeSetView();
      return;
    }

    openSetView();
  };
  const setView = (
    <EuiPopover
      anchorPosition="upRight"
      button={(
        <EuiButton
          className="gisViewControl__gotoButton"
          fill
          size="s"
          onClick={toggleSetViewVisibility}
          data-test-subj="toggleSetViewVisibilityButton"
        >
          Goto
        </EuiButton>)}
      isOpen={isSetViewOpen}
      closePopover={closeSetView}
    >
      <SetView />
    </EuiPopover>
  );

  function renderMouseCoordinates() {
    return (
      <EuiPanel className="gisWidgetControl gisViewControl__coordinates" paddingSize="none">
        <EuiText size="xs">
          <p>
            <strong>lat:</strong> {mouseCoordinates && mouseCoordinates.lat},{' '}
            <strong>lon:</strong> {mouseCoordinates && mouseCoordinates.lon}
          </p>
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiFlexGroup
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem>
        {mouseCoordinates && renderMouseCoordinates()}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {setView}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
