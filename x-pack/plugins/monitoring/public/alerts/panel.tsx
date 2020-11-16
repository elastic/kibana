/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
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

import { CommonAlertStatus, CommonAlertState, AlertMessage } from '../../common/types/alerts';
import { Legacy } from '../legacy_shims';
import { replaceTokens } from './lib/replace_tokens';
import { AlertsContextProvider } from '../../../triggers_actions_ui/public';
import { AlertEdit } from '../../../triggers_actions_ui/public';
import { isInSetupMode, hideBottomBar, showBottomBar } from '../lib/setup_mode';
import { BASE_ALERT_API_PATH } from '../../../alerts/common';
import { SetupModeContext } from '../components/setup_mode/setup_mode_context';

interface Props {
  alert: CommonAlertStatus;
  alertState?: CommonAlertState;
  nextStepsFilter: (nextStep: AlertMessage) => boolean;
}
export const AlertPanel: React.FC<Props> = (props: Props) => {
  const {
    alert: { rawAlert },
    alertState,
    nextStepsFilter = () => true,
  } = props;

  if (!rawAlert) {
    return null;
  }

  /*
    Looks like a false positive, see: https://github.com/typescript-eslint/typescript-eslint/issues/1051#issuecomment-555604349
  */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [showFlyout, setShowFlyout] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isEnabled, setIsEnabled] = useState(rawAlert.enabled);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isMuted, setIsMuted] = useState(rawAlert.muteAll);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isSaving, setIsSaving] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const inSetupMode = isInSetupMode(React.useContext(SetupModeContext));

  const disableAlert = async () => {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERT_API_PATH}/alert/${rawAlert.id}/_disable`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.disableAlert.errorTitle', {
          defaultMessage: `Unable to disable alert`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  };
  const enableAlert = async () => {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERT_API_PATH}/alert/${rawAlert.id}/_enable`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.enableAlert.errorTitle', {
          defaultMessage: `Unable to enable alert`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  };
  const muteAlert = async () => {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERT_API_PATH}/alert/${rawAlert.id}/_mute_all`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.muteAlert.errorTitle', {
          defaultMessage: `Unable to mute alert`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  };

  const unmuteAlert = async () => {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERT_API_PATH}/alert/${rawAlert.id}/_unmute_all`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.ummuteAlert.errorTitle', {
          defaultMessage: `Unable to unmute alert`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  };

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
        initialAlert={rawAlert}
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

  if (inSetupMode || !alertState) {
    return <div style={{ padding: '1rem' }}>{configurationUi}</div>;
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
      <div style={{ padding: '0 1rem 1rem 1rem' }}>{configurationUi}</div>
    </Fragment>
  );
};
