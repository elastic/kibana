/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiAccordion,
  EuiListGroup,
  EuiListGroupItem,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import { replaceTokens } from './lib/replace_tokens';
import { AlertMessage, AlertState } from '../../common/types/alerts';
import { AlertsByName } from './types';
import { isInSetupMode } from '../lib/setup_mode';
import { SetupModeContext } from '../components/setup_mode/setup_mode_context';
import { AlertConfiguration } from './configuration';

interface Props {
  alerts: AlertsByName;
  stateFilter: (state: AlertState) => boolean;
  nextStepsFilter: (nextStep: AlertMessage) => boolean;
}
export const AlertsCallout: React.FC<Props> = (props: Props) => {
  const { alerts, stateFilter = () => true, nextStepsFilter = () => true } = props;
  const inSetupMode = isInSetupMode(React.useContext(SetupModeContext));

  if (inSetupMode) {
    return null;
  }

  const list = [];
  for (const alertTypeId of Object.keys(alerts)) {
    const alertInstance = alerts[alertTypeId];
    for (const state of alertInstance.states) {
      if (state.firing && stateFilter(state.state)) {
        list.push({
          alert: alertInstance,
          state,
        });
      }
    }
  }

  const accordions = list.map((status, index) => {
    const buttonContent = (
      <div>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="alert" size="m" color="danger" />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiTextColor color="danger">
              {replaceTokens(status.state.state.ui.message)}
            </EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );

    const accordion = (
      <EuiAccordion
        id={`monitoringAlertCallout_${index}`}
        buttonContent={buttonContent}
        paddingSize="s"
      >
        <EuiListGroup
          flush={true}
          bordered={true}
          gutterSize="m"
          size="xs"
          style={{
            marginTop: '0.5rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            paddingLeft: `0.5rem`,
          }}
        >
          {(status.state.state.ui.message.nextSteps || [])
            .filter(nextStepsFilter)
            .map((step: AlertMessage) => {
              return <EuiListGroupItem onClick={() => {}} label={replaceTokens(step)} />;
            })}
          <EuiListGroupItem label={<AlertConfiguration alert={status.alert.alert} compressed />} />
        </EuiListGroup>
      </EuiAccordion>
    );

    const spacer = index !== list.length - 1 ? <EuiSpacer /> : null;
    return (
      <div key={index}>
        {accordion}
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
