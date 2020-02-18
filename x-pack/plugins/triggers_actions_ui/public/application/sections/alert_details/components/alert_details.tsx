/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { indexBy } from 'lodash';
import {
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiPage,
  EuiPageContentBody,
  EuiButtonEmpty,
  EuiSwitch,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useAppDependencies } from '../../../app_context';
import { hasSaveAlertsCapability } from '../../../lib/capabilities';
import { Alert, AlertType, ActionType } from '../../../../types';
import {
  ComponentOpts as BulkOperationsComponentOpts,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { AlertInstancesRouteWithApi } from './alert_instances_route';

type AlertDetailsProps = {
  alert: Alert;
  alertType: AlertType;
  actionTypes: ActionType[];
  requestRefresh: () => Promise<void>;
} & Pick<BulkOperationsComponentOpts, 'disableAlert' | 'enableAlert' | 'unmuteAlert' | 'muteAlert'>;

export const AlertDetails: React.FunctionComponent<AlertDetailsProps> = ({
  alert,
  alertType,
  actionTypes,
  disableAlert,
  enableAlert,
  unmuteAlert,
  muteAlert,
  requestRefresh,
}) => {
  const { capabilities } = useAppDependencies();

  const canSave = hasSaveAlertsCapability(capabilities);

  const actionTypesByTypeId = indexBy(actionTypes, 'id');
  const [firstAction, ...otherActions] = alert.actions;

  const [isEnabled, setIsEnabled] = useState<boolean>(alert.enabled);
  const [isMuted, setIsMuted] = useState<boolean>(alert.muteAll);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle size="m">
                <h1 data-test-subj="alertDetailsTitle">{alert.name}</h1>
              </EuiTitle>
            </EuiPageContentHeaderSection>
            <EuiPageContentHeaderSection>
              <EuiFlexGroup responsive={false} gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty disabled={true} iconType="pencil">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.alertDetails.editAlertButtonLabel"
                      defaultMessage="Edit"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty disabled={true} iconType="popout">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.alertDetails.viewAlertInAppButtonLabel"
                      defaultMessage="View in app"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty disabled={true} iconType="menuLeft">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.alertDetails.activityLogButtonLabel"
                      defaultMessage="Activity Log"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiFlexGroup wrap responsive={false} gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup wrap responsive={false} gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiBadge data-test-subj="alertTypeLabel">{alertType.name}</EuiBadge>
                  </EuiFlexItem>
                  {firstAction && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow" data-test-subj="actionTypeLabel">
                        {actionTypesByTypeId[firstAction.actionTypeId].name ??
                          firstAction.actionTypeId}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                  {otherActions.length ? (
                    <EuiFlexItem grow={false} data-test-subj="actionCountLabel">
                      <EuiBadge color="hollow">+{otherActions.length}</EuiBadge>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <EuiFlexGroup wrap responsive={false} gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      name="enable"
                      disabled={!canSave}
                      checked={isEnabled}
                      data-test-subj="enableSwitch"
                      onChange={async () => {
                        if (isEnabled) {
                          setIsEnabled(false);
                          await disableAlert(alert);
                        } else {
                          setIsEnabled(true);
                          await enableAlert(alert);
                        }
                        requestRefresh();
                      }}
                      label={
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.alertDetails.collapsedItemActons.enableTitle"
                          defaultMessage="Enable"
                        />
                      }
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      name="mute"
                      checked={isMuted}
                      disabled={!canSave || !isEnabled}
                      data-test-subj="muteSwitch"
                      onChange={async () => {
                        if (isMuted) {
                          setIsMuted(false);
                          await unmuteAlert(alert);
                        } else {
                          setIsMuted(true);
                          await muteAlert(alert);
                        }
                        requestRefresh();
                      }}
                      label={
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.alertDetails.collapsedItemActons.muteTitle"
                          defaultMessage="Mute"
                        />
                      }
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiFlexItem>
                {alert.enabled ? (
                  <AlertInstancesRouteWithApi requestRefresh={requestRefresh} alert={alert} />
                ) : (
                  <EuiCallOut title="Disabled Alert" color="warning" iconType="help">
                    <p>
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.alertDetails.alertInstances.disabledAlert"
                        defaultMessage="Disabled Alerts do not have an active state, hence Alert Instances cannot be displayed."
                      />
                    </p>
                  </EuiCallOut>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export const AlertDetailsWithApi = withBulkAlertOperations(AlertDetails);
