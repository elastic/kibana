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

interface Props {
  alerts: { [alertTypeId: string]: CommonAlertStatus };
}
export const AlertsCallout: React.FC<Props> = (props: Props) => {
  const { alerts } = props;

  let warningCallout;
  let dangerCallout;

  const warnings = [];
  const dangers = [];
  for (const alertTypeId of Object.keys(alerts)) {
    const alertInstance = alerts[alertTypeId];
    for (const { state } of alertInstance.states) {
      if (state.ui.severity === AlertSeverity.Warning) {
        warnings.push(state);
      } else if (state.ui.severity === AlertSeverity.Danger) {
        dangers.push(state);
      }
    }
  }

  if (warnings.length) {
    warningCallout = (
      <Fragment>
        <EuiCallOut title="Warnings" color="warning" iconType="alert">
          <ul>
            {warnings.map((state, index) => {
              return <li key={index}>{replaceTokens(state.ui.message)}</li>;
            })}
          </ul>
        </EuiCallOut>
        <EuiSpacer />
      </Fragment>
    );
  }

  if (dangers.length) {
    dangerCallout = (
      <Fragment>
        <EuiCallOut title="Dangers" color="danger" iconType="alert">
          <ul>
            {dangers.map((state, index) => {
              return <li key={index}>{replaceTokens(state.ui.message)}</li>;
            })}
          </ul>
        </EuiCallOut>
        <EuiSpacer />
      </Fragment>
    );
  }

  return (
    <Fragment>
      {warningCallout}
      {dangerCallout}
    </Fragment>
  );
};
