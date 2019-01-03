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
      button={(
        <EuiButtonEmpty
          size="xs"
          onClick={toggleSetViewVisibility}
          data-test-subj="toggleSetViewVisibilityButton"
        >
          Goto
        </EuiButtonEmpty>)}
      isOpen={isSetViewOpen}
      closePopover={closeSetView}
    >
      <SetView />
    </EuiPopover>
  );

  function renderMouseCoordinates() {
    if (!mouseCoordinates) {
      return null;
    }

    return (
      <EuiText>
        lat: {mouseCoordinates.lat}, lon: {mouseCoordinates.lon}
      </EuiText>
    );
  }

  return (
    <EuiPanel className="WidgetControl" hasShadow paddingSize="none">
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          {setView}
        </EuiFlexItem>
        <EuiFlexItem>
          {renderMouseCoordinates()}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
