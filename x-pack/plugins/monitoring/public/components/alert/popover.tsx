/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiPopover, EuiBadge, EuiTitle, EuiHorizontalRule } from '@elastic/eui';

import { CommonAlertStatus } from '../../../common/types';
import { AlertPopoverStatus } from './status';

interface AlertPopoverProps {
  alert: CommonAlertStatus;
}
export const AlertPopover: React.FC<AlertPopoverProps> = (props: AlertPopoverProps) => {
  const states = props.alert.states;
  const [showAlert, setShowAlert] = React.useState(false);

  if (!props.alert.alert.rawAlert) {
    return null;
  }

  const firingStates = states.filter(state => state.firing);
  if (!firingStates.length) {
    return null;
  }

  const firingState = firingStates[0];

  return (
    <EuiPopover
      button={
        <EuiBadge
          color={firingState.state.ui.severity}
          iconType="alert"
          onClickAriaLabel="Show alert"
          iconOnClickAriaLabel="Show alert"
          iconOnClick={() => setShowAlert(true)}
          onClick={() => setShowAlert(true)}
        >
          View alert
        </EuiBadge>
      }
      isOpen={showAlert}
      anchorPosition="rightCenter"
      closePopover={() => setShowAlert(false)}
    >
      <div style={{ maxWidth: '400px' }}>
        <EuiTitle size="xs">
          <h2>{props.alert.alert.label} alert</h2>
        </EuiTitle>
        <EuiHorizontalRule margin="xs" />
        <AlertPopoverStatus alert={props.alert} />
      </div>
    </EuiPopover>
  );
};
