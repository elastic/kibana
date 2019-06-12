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
  EuiButtonIcon,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { SetView } from './set_view';
import { DECIMAL_DEGREES_PRECISION } from '../../../../common/constants';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

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
        <EuiButtonIcon
          className="mapViewControl__gotoButton"
          onClick={toggleSetViewVisibility}
          data-test-subj="toggleSetViewVisibilityButton"
          iconType="crosshairs"
          color="text"
          aria-label={i18n.translate('xpack.maps.viewControl.goToButtonLabel', {
            defaultMessage: 'Go to'
          })}
          title={i18n.translate('xpack.maps.viewControl.goToButtonLabel', {
            defaultMessage: 'Go to'
          })}
        />
      )}
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
      <div className="mapViewControl__coordinates">
        <EuiText size="xs">
          <small>
            <strong>
              <FormattedMessage
                id="xpack.maps.viewControl.latLabel"
                defaultMessage="lat:"
              />
            </strong> {lat},{' '}
            <strong>
              <FormattedMessage
                id="xpack.maps.viewControl.lonLabel"
                defaultMessage="lon:"
              />
            </strong> {lon}
          </small>
        </EuiText>
      </div>
    );
  }

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      alignItems="flexEnd"
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        {mouseCoordinates && renderMouseCoordinates()}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {setView}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
