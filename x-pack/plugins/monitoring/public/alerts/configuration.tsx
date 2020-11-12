/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { CommonBaseAlert } from '../../common/types/alerts';
import { Legacy } from '../legacy_shims';
import { AlertsContextProvider } from '../../../triggers_actions_ui/public';
import { AlertEdit } from '../../../triggers_actions_ui/public';
import { hideBottomBar, showBottomBar } from '../lib/setup_mode';
import { BASE_ALERT_API_PATH } from '../../../alerts/common';

interface Props {
  alert: CommonBaseAlert;
  compressed?: boolean;
}
export const AlertConfiguration: React.FC<Props> = (props: Props) => {
  const { alert, compressed } = props;
  const [showFlyout, setShowFlyout] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(alert.rawAlert.enabled);
  const [isMuted, setIsMuted] = React.useState(alert.rawAlert.muteAll);
  const [isSaving, setIsSaving] = React.useState(false);

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

  return (
    <Fragment>
      <EuiFlexGroup
        justifyContent={compressed ? 'flexStart' : 'spaceBetween'}
        gutterSize={compressed ? 'm' : 'xs'}
        alignItems="center"
      >
        <EuiFlexItem grow={false}>
          <EuiButton
            size={compressed ? 's' : 'm'}
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
};
