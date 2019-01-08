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
          flush="right"
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
    return (
      <Fragment>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <p>
              <strong>lat:</strong> {mouseCoordinates && mouseCoordinates.lat}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <p>
              <strong>long:</strong> {mouseCoordinates && mouseCoordinates.lon}
            </p>
          </EuiText>
        </EuiFlexItem>
      </Fragment>
    );
  }

  return (
    <EuiPanel className="gisWidgetControl" hasShadow paddingSize="s">
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
      >

        {renderMouseCoordinates()}

        <EuiFlexItem grow={false}>
          {setView}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
