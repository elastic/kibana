/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { CommonAlert } from '../../common/types/alerts';
import { Legacy } from '../legacy_shims';
import { hideBottomBar, showBottomBar } from '../lib/setup_mode';

interface Props {
  alert: CommonAlert;
  compressed?: boolean;
}
export const AlertConfiguration: React.FC<Props> = (props: Props) => {
  const { alert, compressed } = props;
  const [showFlyout, setShowFlyout] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(alert.enabled);
  const [isMuted, setIsMuted] = React.useState(alert.muteAll);
  const [isSaving, setIsSaving] = React.useState(false);

  async function disableAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERTING_API_PATH}/rule/${alert.id}/_disable`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.disableAlert.errorTitle', {
          defaultMessage: `Unable to disable rule`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }
  async function enableAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERTING_API_PATH}/rule/${alert.id}/_enable`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.enableAlert.errorTitle', {
          defaultMessage: `Unable to enable rule`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }
  async function muteAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERTING_API_PATH}/rule/${alert.id}/_mute_all`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.muteAlert.errorTitle', {
          defaultMessage: `Unable to mute rule`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }
  async function unmuteAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERTING_API_PATH}/rule/${alert.id}/_unmute_all`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.ummuteAlert.errorTitle', {
          defaultMessage: `Unable to unmute rule`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }

  const flyoutUi = useMemo(
    () =>
      showFlyout &&
      Legacy.shims.triggersActionsUi.getEditAlertFlyout({
        initialRule: {
          ...alert,
          ruleTypeId: alert.alertTypeId,
        },
        onClose: () => {
          setShowFlyout(false);
          showBottomBar();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showFlyout]
  );

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
              defaultMessage: `Edit rule`,
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
