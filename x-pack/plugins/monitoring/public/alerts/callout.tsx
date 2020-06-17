/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { CommonAlertStatus } from '../../common/types';
import { AlertSeverity } from '../../common/enums';
import { replaceTokens } from './replace_tokens';
import { AlertMessage } from '../../server/alerts/types';

const TYPES = [
  {
    severity: AlertSeverity.Warning,
    color: 'warning',
    label: 'Warning alert(s)',
  },
  {
    severity: AlertSeverity.Danger,
    color: 'danger',
    label: 'Danger alert(s)',
  },
];

interface Props {
  alerts: { [alertTypeId: string]: CommonAlertStatus };
}
export const AlertsCallout: React.FC<Props> = (props: Props) => {
  const { alerts } = props;

  const callouts = TYPES.map((type) => {
    const list = [];
    for (const alertTypeId of Object.keys(alerts)) {
      const alertInstance = alerts[alertTypeId];
      for (const { state } of alertInstance.states) {
        if (state.ui.severity === type.severity) {
          list.push(state);
        }
      }
    }

    if (list.length) {
      return (
        <Fragment>
          <EuiCallOut title={type.label} color={type.severity} iconType="bell">
            <ul>
              {list.map((state, index) => {
                const nextStepsUi =
                  state.ui.message.nextSteps && state.ui.message.nextSteps.length ? (
                    <ul>
                      {state.ui.message.nextSteps.map(
                        (step: AlertMessage, nextStepIndex: number) => (
                          <li key={nextStepIndex}>{replaceTokens(step)}</li>
                        )
                      )}
                    </ul>
                  ) : null;

                return (
                  <li key={index}>
                    {replaceTokens(state.ui.message)}
                    {nextStepsUi}
                  </li>
                );
              })}
            </ul>
          </EuiCallOut>
          <EuiSpacer />
        </Fragment>
      );
    }
  });
  return <Fragment>{callouts}</Fragment>;
};
