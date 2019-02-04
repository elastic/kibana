/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
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
import { DECIMAL_DEGREES_PRECISION } from '../../../../common/constants';

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
          className="mapViewControl__gotoButton"
          fill
          size="s"
          onClick={toggleSetViewVisibility}
          data-test-subj="toggleSetViewVisibilityButton"
        >
          Go to
        </EuiButton>)}
      isOpen={isSetViewOpen}
      closePopover={closeSetView}
    >
      <SetView />
    </EuiPopover>
  );

  function renderMouseCoordinates() {
    const lat = mouseCoordinates
      ? _.round(mouseCoordinates.lat, DECIMAL_DEGREES_PRECISION)
      : '';
    const lon = mouseCoordinates
      ? _.round(mouseCoordinates.lon, DECIMAL_DEGREES_PRECISION)
      : '';
    return (
      <EuiPanel className="mapWidgetControl mapViewControl__coordinates" paddingSize="none">
        <EuiText size="xs">
          <p>
            <strong>lat:</strong> {lat},{' '}
            <strong>lon:</strong> {lon}
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
