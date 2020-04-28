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
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiPage,
  EuiPageContentBody,
  EuiSwitch,
  EuiCallOut,
  EuiSpacer,
  EuiBetaBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useAppDependencies } from '../../../app_context';
import { hasSaveAlertsCapability } from '../../../lib/capabilities';
import { Alert, AlertType, ActionType } from '../../../../types';
import {
  ComponentOpts as BulkOperationsComponentOpts,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { AlertInstancesRouteWithApi } from './alert_instances_route';
import { ViewInApp } from './view_in_app';
import { PLUGIN } from '../../../constants/plugin';
import { CountryFlag } from 'x-pack/legacy/plugins/siem/public/components/source_destination/country_flag';

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
  
  // const alertActions = alert.actions;
  // const myCount = data.reduce((obj, v) => {
  //   obj[v.actionTypeId] = (obj[v.actionTypeId] || 0) + 1;
  //   return obj;
  // }, {})
  // console.log(myCount, 'myCount');
  // const uniqueActions = Array.from(new Set(alertActions.map((item: any) => item.actionTypeId)));
  // console.log(uniqueActions, 'unique');
  // const [firstAction, secondAction, thirdAction, ...otherActions] = uniqueActions;
  const [firstAction, secondAction, thirdAction, ...otherActions] = alert.actions;
  const [isEnabled, setIsEnabled] = useState<boolean>(alert.enabled);
  const [isMuted, setIsMuted] = useState<boolean>(alert.muteAll);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle size="m">
                <h1>
                  <span data-test-subj="alertDetailsTitle">{alert.name}</span>
                  &emsp;
                  <EuiBetaBadge
                    label="Beta"
                    tooltipContent={i18n.translate(
                      'xpack.triggersActionsUI.sections.alertDetails.betaBadgeTooltipContent',
                      {
                        defaultMessage:
                          '{pluginName} is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features.',
                        values: {
                          pluginName: PLUGIN.getI18nName(i18n),
                        },
                      }
                    )}
                  />
                </h1>
              </EuiTitle>
            </EuiPageContentHeaderSection>
            <EuiPageContentHeaderSection>
              <EuiFlexGroup responsive={false} gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <ViewInApp alert={alert} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiFlexGroup wrap responsive={false} gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup wrap responsive={false} gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <p>
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.alertTypeTitle"
                          defaultMessage="Type"
                        />
                      </p>
                    </EuiText>
                    <EuiSpacer size="xs" />
                    <EuiBadge data-test-subj="alertTypeLabel">{alertType.name}</EuiBadge>
                  </EuiFlexItem>
                  {firstAction && (
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <p>
                          <FormattedMessage
                            id="xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.actionsTex"
                            defaultMessage="Actions"
                          />
                        </p>
                      </EuiText>
                      <EuiSpacer size="xs" />
                      <EuiFlexGroup gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="hollow" data-test-subj="actionTypeLabel">
                            {actionTypesByTypeId[firstAction.actionTypeId].name ??
                              firstAction.actionTypeId}
                          </EuiBadge>
                        </EuiFlexItem>
                        {secondAction && (
                          <EuiFlexItem grow={false}>
                            <EuiBadge color="hollow" data-test-subj="actionTypeLabel">
                              {actionTypesByTypeId[secondAction.actionTypeId].name ??
                                secondAction.actionTypeId}
                            </EuiBadge>
                          </EuiFlexItem>
                        )}
                        {thirdAction && (
                          <EuiFlexItem grow={false}>
                            <EuiBadge color="hollow" data-test-subj="actionTypeLabel">
                              {actionTypesByTypeId[thirdAction.actionTypeId].name ??
                                thirdAction.actionTypeId}
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
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <EuiSpacer />
                <EuiFlexGroup justifyContent="flexEnd" wrap responsive={false} gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      name="disable"
                      disabled={!canSave}
                      checked={!isEnabled}
                      data-test-subj="disableSwitch"
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
                          id="xpack.triggersActionsUI.sections.alertDetails.collapsedItemActons.disableTitle"
                          defaultMessage="Disable"
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
                          defaultMessage="This alert is disabled and cannot be displayed. Toggle Enable ↑ to activate it."
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
