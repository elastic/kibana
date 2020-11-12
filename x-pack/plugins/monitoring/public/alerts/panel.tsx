/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';

import { CommonBaseAlert, CommonAlertState, AlertMessage } from '../../common/types/alerts';
import { replaceTokens } from './lib/replace_tokens';
import { isInSetupMode } from '../lib/setup_mode';
import { SetupModeContext } from '../components/setup_mode/setup_mode_context';
import { AlertConfiguration } from './configuration';

interface Props {
  alert: CommonBaseAlert;
  alertState?: CommonAlertState;
  nextStepsFilter?: (nextStep: AlertMessage) => boolean;
}
export const AlertPanel: React.FC<Props> = (props: Props) => {
  const { alert, alertState, nextStepsFilter = () => true } = props;
  const inSetupMode = isInSetupMode(React.useContext(SetupModeContext));

  if (!alert.rawAlert) {
    return null;
  }

  if (inSetupMode || !alertState) {
    return (
      <div style={{ padding: '1rem' }}>
        <AlertConfiguration alert={alert} />
      </div>
    );
  }

  const nextStepsUi =
    alertState.state.ui.message.nextSteps && alertState.state.ui.message.nextSteps.length ? (
      <EuiListGroup>
        {alertState.state.ui.message.nextSteps
          .filter(nextStepsFilter)
          .map((step: AlertMessage, index: number) => (
            <EuiListGroupItem size="s" key={index} label={replaceTokens(step)} />
          ))}
      </EuiListGroup>
    ) : null;

  return (
    <Fragment>
      <div style={{ padding: '1rem' }}>
        <EuiTitle size="xs">
          <h5>{replaceTokens(alertState.state.ui.message)}</h5>
        </EuiTitle>
        {nextStepsUi ? <EuiSpacer size="s" /> : null}
        {nextStepsUi}
      </div>
      <EuiHorizontalRule margin="s" />
      <div style={{ padding: '0 1rem 1rem 1rem' }}>
        <AlertConfiguration alert={alert} />
      </div>
    </Fragment>
  );
};
