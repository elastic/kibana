/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiPopover,
  EuiCallOut,
  EuiBadge,
  EuiHorizontalRule,
} from '@elastic/eui';

import { CommonAlertStatus, CommonActionDefaultParameters } from '../../../../common/types';
import { replaceTokens } from '../lib/replace_tokens';
import { AlertPopoverContext } from '../lib/context';
import { AlertMessage } from '../../../../server/alerts/types';
import { Legacy } from '../../../legacy_shims';
import { ActionType, ActionResult } from '../../../../../actions/common';
import { AlertPopoverTriggeredActions } from './triggered_actions';
import { AlertPopoverSettings } from './settings';

interface AlertPopoverProps {
  alert: CommonAlertStatus;
}
export const AlertPopover: React.FC<AlertPopoverProps> = (props: AlertPopoverProps) => {
  const states = props.alert.states;
  const [alert, setAlert] = React.useState(props.alert.alert);
  const [showAlert, setShowAlert] = React.useState(false);
  const [validConnectorTypes, setValidConnectorTypes] = React.useState<ActionType[]>([]);
  const [configuredActions, setConfiguredActions] = React.useState<ActionResult[]>([]);
  const [defaultParametersByAlertType, setDefaultParametersByAlertType] = React.useState<
    CommonActionDefaultParameters
  >({} as any);

  React.useEffect(() => {
    (async () => {
      const {
        types,
        actions: _actions,
        defaultParametersByAlertType: _defaultParametersByAlertType,
      } = await Legacy.shims.kfetch({
        method: 'GET',
        pathname: `/api/monitoring/v1/alert/actions`,
      });
      setConfiguredActions(_actions);
      setValidConnectorTypes(types);
      setDefaultParametersByAlertType(_defaultParametersByAlertType);
    })();
  }, []);

  if (!alert.rawAlert) {
    return null;
  }

  function addAction(action: ActionResult) {
    setConfiguredActions([...configuredActions, action]);
  }
  function updateThrottle(throttle: string | null) {
    if (throttle) {
      setAlert({
        ...alert,
        rawAlert: {
          ...alert.rawAlert,
          throttle,
        },
      });
    }
  }

  const firingStates = states.filter(state => state.firing);
  if (!firingStates.length) {
    return null;
  }

  const firingState = firingStates[0];
  const nextStepsUi =
    firingState.state.ui.message.nextSteps && firingState.state.ui.message.nextSteps.length ? (
      <ul>
        {firingState.state.ui.message.nextSteps.map((step: AlertMessage, index: number) => (
          <li key={index}>{replaceTokens(step)}</li>
        ))}
      </ul>
    ) : null;

  return (
    <Fragment>
      <AlertPopoverContext.Provider
        value={{
          alert,
          validConnectorTypes,
          configuredActions,
          defaultParametersByAlertType,
          addAction,
          updateThrottle,
        }}
      >
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
              <h2>{alert.label} alert</h2>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
            <EuiCallOut title={replaceTokens(firingState.state.ui.message)} color="warning">
              {nextStepsUi}
            </EuiCallOut>
            <EuiSpacer size="m" />
            <AlertPopoverTriggeredActions />
            <EuiSpacer size="s" />
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h3>Alert settings</h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <AlertPopoverSettings />
          </div>
        </EuiPopover>
      </AlertPopoverContext.Provider>
    </Fragment>
  );
};
