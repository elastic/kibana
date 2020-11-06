/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiAccordion,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { replaceTokens } from './lib/replace_tokens';
import { AlertMessage, AlertState } from '../../common/types/alerts';
import { AlertsByName } from './types';

interface Props {
  alerts: AlertsByName;
  stateFilter: (state: AlertState) => boolean;
  nextStepsFilter: (nextStep: AlertMessage) => boolean;
}
export const AlertsCallout: React.FC<Props> = (props: Props) => {
  const { alerts, stateFilter = () => true, nextStepsFilter = () => true } = props;

  const list = [];
  for (const alertTypeId of Object.keys(alerts)) {
    const alertInstance = alerts[alertTypeId];
    for (const { firing, state } of alertInstance.states) {
      if (firing && stateFilter(state)) {
        list.push(state);
      }
    }
  }

  const accordions = list.map((state, index) => {
    const buttonContent = (
      <EuiCallOut title={replaceTokens(state.ui.message)} color="danger" iconType="bell" size="s" />
    );
    const nextStepsUi =
      state.ui.message.nextSteps && state.ui.message.nextSteps.length ? (
        <EuiListGroup gutterSize="none" style={{ paddingLeft: '1rem' }}>
          {state.ui.message.nextSteps
            .filter(nextStepsFilter)
            .map((step: AlertMessage, nextStepIndex: number) => (
              <EuiListGroupItem key={nextStepIndex} label={replaceTokens(step)} />
            ))}
        </EuiListGroup>
      ) : null;
    const spacer = index !== list.length - 1 ? <EuiSpacer /> : null;
    return (
      <div key={index}>
        <EuiAccordion id={`accordionForm${index}`} buttonContent={buttonContent} paddingSize="xs">
          {nextStepsUi}
        </EuiAccordion>
        {spacer}
      </div>
    );
  });

  return (
    <Fragment>
      <EuiPanel>{accordions}</EuiPanel>
      <EuiSpacer />
    </Fragment>
  );
};
