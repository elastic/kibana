/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { keyBy } from 'lodash';
import { useHistory } from 'react-router-dom';
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
  EuiButtonEmpty,
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
import { AlertEdit } from '../../alert_form';
import { AlertsContextProvider } from '../../../context/alerts_context';
import { routeToAlertDetails } from '../../../constants';

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
  const history = useHistory();
  const {
    http,
    toastNotifications,
    capabilities,
    alertTypeRegistry,
    actionTypeRegistry,
    uiSettings,
    docLinks,
    charts,
    dataPlugin,
  } = useAppDependencies();

  const canSave = hasSaveAlertsCapability(capabilities);
  const actionTypesByTypeId = keyBy(actionTypes, 'id');
  const hasEditButton =
    canSave && alertTypeRegistry.has(alert.alertTypeId)
      ? !alertTypeRegistry.get(alert.alertTypeId).requiresAppContext
      : false;

  const alertActions = alert.actions;
  const uniqueActions = Array.from(new Set(alertActions.map((item: any) => item.actionTypeId)));
  const [isEnabled, setIsEnabled] = useState<boolean>(alert.enabled);
  const [isMuted, setIsMuted] = useState<boolean>(alert.muteAll);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);

  const setAlert = async () => {
    history.push(routeToAlertDetails.replace(`:alertId`, alert.id));
  };

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
                {hasEditButton ? (
                  <EuiFlexItem grow={false}>
                    <Fragment>
                      {' '}
                      <EuiButtonEmpty
                        data-test-subj="openEditAlertFlyoutButton"
                        iconType="pencil"
                        onClick={() => setEditFlyoutVisibility(true)}
                      >
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.alertDetails.editAlertButtonLabel"
                          defaultMessage="Edit"
                        />
                      </EuiButtonEmpty>
                      {editFlyoutVisible && (
                        <AlertsContextProvider
                          value={{
                            http,
                            actionTypeRegistry,
                            alertTypeRegistry,
                            toastNotifications,
                            uiSettings,
                            docLinks,
                            charts,
                            dataFieldsFormats: dataPlugin.fieldFormats,
                            reloadAlerts: setAlert,
                            capabilities,
                          }}
                        >
                          <AlertEdit
                            initialAlert={alert}
                            onClose={() => setEditFlyoutVisibility(false)}
                          />
                        </AlertsContextProvider>
                      )}
                    </Fragment>
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <ViewInApp alert={alert} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
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
              <EuiFlexItem grow={1}>
                {uniqueActions && uniqueActions.length ? (
                  <Fragment>
                    <EuiText size="s">
                      <p>
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.actionsTex"
                          defaultMessage="Actions"
                        />
                      </p>
                    </EuiText>
                    <EuiSpacer size="xs" />
                    <EuiFlexGroup wrap gutterSize="s">
                      {uniqueActions.map((action, index) => (
                        <EuiFlexItem key={index} grow={false}>
                          <EuiBadge color="hollow" data-test-subj="actionTypeLabel">
                            {actionTypesByTypeId[action].name ?? action}
                          </EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </Fragment>
                ) : null}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
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
              <EuiFlexItem>
                {alert.enabled ? (
                  <AlertInstancesRouteWithApi requestRefresh={requestRefresh} alert={alert} />
                ) : (
                  <Fragment>
                    <EuiSpacer />
                    <EuiCallOut title="Disabled Alert" color="warning" iconType="help">
                      <p>
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.alertDetails.alertInstances.disabledAlert"
                          defaultMessage="This alert is disabled and cannot be displayed. Toggle Disable ↑ to activate it."
                        />
                      </p>
                    </EuiCallOut>
                  </Fragment>
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
