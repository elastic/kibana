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
  EuiCallOut,
  EuiLink,
  EuiText,
} from '@elastic/eui';

import { CommonAlertStatus, CommonActionDefaultParameters } from '../../../common/types';
import { replaceTokens, AlertPopoverContext } from './lib';
import { AlertMessage } from '../../../server/alerts/types';
import { Legacy } from '../../legacy_shims';
import { ActionType, ActionResult } from '../../../../actions/common';
import { AlertPopoverTriggeredActions } from './triggered_actions';
import { AlertPopoverSettings } from './settings';

interface AlertPopoverStatusProps {
  alert: CommonAlertStatus;
}
export const AlertPopoverStatus: React.FC<AlertPopoverStatusProps> = (
  props: AlertPopoverStatusProps
) => {
  const states = props.alert.states;
  const [alert, setAlert] = React.useState(props.alert.alert);
  const [validConnectorTypes, setValidConnectorTypes] = React.useState<ActionType[]>([]);
  const [configuredActions, setConfiguredActions] = React.useState<ActionResult[]>([]);
  const [defaultParametersByAlertType, setDefaultParametersByAlertType] = React.useState<
    CommonActionDefaultParameters
  >({} as any);
  const [isEditMode, setIsEditMode] = React.useState(false);

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
      <Fragment>
        <EuiCallOut
          title={replaceTokens(firingState.state.ui.message)}
          color={firingState.state.ui.severity}
        >
          {nextStepsUi}
        </EuiCallOut>
        <EuiSpacer size="m" />
        <AlertPopoverTriggeredActions isEditMode={isEditMode} />
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>Alert settings</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <AlertPopoverSettings isEditMode={isEditMode} />
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiLink onClick={() => setIsEditMode(!isEditMode)}>
              <EuiText size="s">{isEditMode ? 'Stop configuring' : 'Configure'}</EuiText>
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    </AlertPopoverContext.Provider>
  );
};
