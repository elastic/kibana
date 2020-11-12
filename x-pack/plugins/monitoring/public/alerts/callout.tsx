/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiCallOut,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
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
  const [activeDetailsPopover, setActiveDetailsPopover] = React.useState<boolean | number>(false);
  const [activeConfigPopover, setActiveConfigPopover] = React.useState<boolean | number>(false);

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
    const detailsPanels = [
      {
        id: 0,
        title: status.alert.alert.label,
        items: (status.state.state.ui.message.nextSteps || [])
          .filter(nextStepsFilter)
          .map((step: AlertMessage) => {
            return {
              name: <EuiText size="s">{replaceTokens(step)}</EuiText>,
            };
          }),
      },
    ];
    const configPanels = [
      {
        id: 0,
        title: status.alert.alert.label,
        width: 400,
        content: (
          <div style={{ padding: '1rem' }}>
            <AlertConfiguration alert={status.alert.alert} compressed />
          </div>
        ),
      },
    ];
    const detailsButton = (
      <EuiLink onClick={() => setActiveDetailsPopover(index)}>
        <EuiText size="s">
          {i18n.translate('xpack.monitoring.alerts.callout.viewDetails', {
            defaultMessage: 'View details',
          })}
        </EuiText>
      </EuiLink>
    );
    const configButton = (
      <EuiLink onClick={() => setActiveConfigPopover(index)}>
        <EuiText size="s">
          {i18n.translate('xpack.monitoring.alerts.callout.configure', {
            defaultMessage: 'configure',
          })}
        </EuiText>
      </EuiLink>
    );
    const title = (
      <EuiFlexGroup alignItems="baseline" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="s" style={{ display: 'inline' }}>
            {replaceTokens(status.state.state.ui.message)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="baseline" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={detailsButton}
                isOpen={activeDetailsPopover === index}
                closePopover={() => setActiveDetailsPopover(false)}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenu initialPanelId={0} panels={detailsPanels} />
              </EuiPopover>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">or</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={configButton}
                isOpen={activeConfigPopover === index}
                closePopover={() => setActiveConfigPopover(false)}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenu initialPanelId={0} panels={configPanels} />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
    const buttonContent = <EuiCallOut title={title} color="danger" iconType="bell" size="s" />;

    const spacer = index !== list.length - 1 ? <EuiSpacer /> : null;
    return (
      <div key={index}>
        {buttonContent}
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
