/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiTitle,
  EuiHorizontalRule,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';

import { CommonAlertStatus } from '../../common/types';
import { AlertMessage } from '../../server/alerts/types';
import { Legacy } from '../legacy_shims';
import { replaceTokens } from './lib/replace_tokens';
import { AlertsContextProvider } from '../../../triggers_actions_ui/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertEdit } from '../../../triggers_actions_ui/public';
import { isInSetupMode, hideBottomBar, showBottomBar } from '../lib/setup_mode';
import { BASE_ALERT_API_PATH } from '../../../alerts/common';

interface Props {
  alert: CommonAlertStatus;
}
export const AlertPanel: React.FC<Props> = (props: Props) => {
  const {
    alert: { states, alert },
  } = props;
  const [showFlyout, setShowFlyout] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(alert.rawAlert.enabled);
  const [isMuted, setIsMuted] = React.useState(alert.rawAlert.muteAll);
  const [isSaving, setIsSaving] = React.useState(false);
  const inSetupMode = isInSetupMode();

  if (!alert.rawAlert) {
    return null;
  }

  async function disableAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERT_API_PATH}/alert/${alert.rawAlert.id}/_disable`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.disableAlert.errorTitle', {
          defaultMessage: `Unable to disable alert`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }
  async function enableAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERT_API_PATH}/alert/${alert.rawAlert.id}/_enable`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.enableAlert.errorTitle', {
          defaultMessage: `Unable to enable alert`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }
  async function muteAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERT_API_PATH}/alert/${alert.rawAlert.id}/_mute_all`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.muteAlert.errorTitle', {
          defaultMessage: `Unable to mute alert`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }
  async function unmuteAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERT_API_PATH}/alert/${alert.rawAlert.id}/_unmute_all`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.ummuteAlert.errorTitle', {
          defaultMessage: `Unable to unmute alert`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }

  const flyoutUi = showFlyout ? (
    <AlertsContextProvider
      value={{
        http: Legacy.shims.http,
        actionTypeRegistry: Legacy.shims.actionTypeRegistry,
        alertTypeRegistry: Legacy.shims.alertTypeRegistry,
        toastNotifications: Legacy.shims.toastNotifications,
        uiSettings: Legacy.shims.uiSettings,
        docLinks: Legacy.shims.docLinks,
        reloadAlerts: async () => {},
        capabilities: Legacy.shims.capabilities,
      }}
    >
      <AlertEdit
        initialAlert={alert.rawAlert}
        onClose={() => {
          setShowFlyout(false);
          showBottomBar();
        }}
      />
    </AlertsContextProvider>
  ) : null;

  const configurationUi = (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() => {
              setShowFlyout(true);
              hideBottomBar();
            }}
          >
            {i18n.translate('xpack.monitoring.alerts.panel.editAlert', {
              defaultMessage: `Edit alert`,
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            name="disable"
            disabled={isSaving}
            checked={!isEnabled}
            onChange={async () => {
              if (isEnabled) {
                setIsEnabled(false);
                await disableAlert();
              } else {
                setIsEnabled(true);
                await enableAlert();
              }
            }}
            label={
              <FormattedMessage
                id="xpack.monitoring.alerts.panel.disableTitle"
                defaultMessage="Disable"
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            name="mute"
            disabled={isSaving}
            checked={isMuted}
            data-test-subj="muteSwitch"
            onChange={async () => {
              if (isMuted) {
                setIsMuted(false);
                await unmuteAlert();
              } else {
                setIsMuted(true);
                await muteAlert();
              }
            }}
            label={
              <FormattedMessage
                id="xpack.monitoring.alerts.panel.muteTitle"
                defaultMessage="Mute"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {flyoutUi}
    </Fragment>
  );

  if (inSetupMode) {
    return <div style={{ padding: '1rem' }}>{configurationUi}</div>;
  }

  const firingStates = states.filter((state) => state.firing);
  if (!firingStates.length) {
    return <div style={{ padding: '1rem' }}>{configurationUi}</div>;
  }

  const firingState = firingStates[0];
  const nextStepsUi =
    firingState.state.ui.message.nextSteps && firingState.state.ui.message.nextSteps.length ? (
      <EuiListGroup>
        {firingState.state.ui.message.nextSteps.map((step: AlertMessage, index: number) => (
          <EuiListGroupItem size="s" key={index} label={replaceTokens(step)} />
        ))}
      </EuiListGroup>
    ) : null;

  return (
    <Fragment>
      <div style={{ padding: '1rem' }}>
        <EuiTitle size="xs">
          <h5>{replaceTokens(firingState.state.ui.message)}</h5>
        </EuiTitle>
        {nextStepsUi ? <EuiSpacer size="s" /> : null}
        {nextStepsUi}
      </div>
      <EuiHorizontalRule margin="s" />
      <div style={{ padding: '0 1rem 1rem 1rem' }}>{configurationUi}</div>
    </Fragment>
  );
};
