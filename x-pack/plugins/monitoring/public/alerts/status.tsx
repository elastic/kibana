/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiSpacer, EuiCallOut, EuiButton } from '@elastic/eui';

import {
  CommonAlertStatus,
  CommonActionDefaultParameters,
  CommonBaseAlert,
} from '../../common/types';
import { AlertMessage } from '../../server/alerts/types';
import { Legacy } from '../legacy_shims';
import { ActionType, ActionResult } from '../../../actions/common';
import { replaceTokens } from './replace_tokens';
import { AlertsContextProvider } from '../../../triggers_actions_ui/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import AlertEdit from '../../../triggers_actions_ui/public/application/sections/alert_form/alert_edit';

interface Props {
  alert: CommonAlertStatus;
}
export const AlertStatus: React.FC<Props> = (props: Props) => {
  const {
    alert: { states, alert },
  } = props;
  const [showFlyout, setShowFlyout] = React.useState(false);

  if (!alert.rawAlert) {
    return null;
  }

  const firingStates = states.filter((state) => state.firing);
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

  const flyoutUi = showFlyout ? (
    <AlertsContextProvider
      value={{
        http: Legacy.shims.http,
        actionTypeRegistry: Legacy.shims.actionTypeRegistry,
        alertTypeRegistry: Legacy.shims.alertTypeRegistry,
        toastNotifications: Legacy.shims.toastNotifications,
        uiSettings: Legacy.shims.uiSettings,
        docLinks: Legacy.shims.docLinks,
        charts: undefined,
        dataFieldsFormats: undefined,
        reloadAlerts: async () => {},
        capabilities: Legacy.shims.capabilities,
      }}
    >
      <AlertEdit initialAlert={alert.rawAlert} onClose={() => setShowFlyout(false)} />
    </AlertsContextProvider>
  ) : null;

  return (
    <Fragment>
      <EuiCallOut
        title={replaceTokens(firingState.state.ui.message)}
        color={firingState.state.ui.severity}
      >
        {nextStepsUi}
      </EuiCallOut>
      {alert.isLegacy ? null : (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiButton onClick={() => setShowFlyout(true)}>View alert configuration</EuiButton>
          {flyoutUi}
        </Fragment>
      )}
    </Fragment>
  );
};
