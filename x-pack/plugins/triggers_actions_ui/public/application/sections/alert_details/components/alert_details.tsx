/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useReducer } from 'react';
import { keyBy } from 'lodash';
import { useHistory } from 'react-router-dom';
import {
  EuiPageHeader,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiPageContentBody,
  EuiSwitch,
  EuiCallOut,
  EuiSpacer,
  EuiButtonEmpty,
  EuiButton,
  EuiLoadingSpinner,
  EuiIconTip,
  EuiEmptyPrompt,
  EuiPageTemplate,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AlertExecutionStatusErrorReasons } from '../../../../../../alerting/common';
import { hasAllPrivilege, hasExecuteActionsCapability } from '../../../lib/capabilities';
import { getAlertingSectionBreadcrumb, getAlertDetailsBreadcrumb } from '../../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../../lib/doc_title';
import { Alert, AlertType, ActionType, ActionConnector } from '../../../../types';
import {
  ComponentOpts as BulkOperationsComponentOpts,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { AlertInstancesRouteWithApi } from './alert_instances_route';
import { ViewInApp } from './view_in_app';
import { AlertEdit } from '../../alert_form';
import { routeToRuleDetails } from '../../../constants';
import { alertsErrorReasonTranslationsMapping } from '../../alerts_list/translations';
import { useKibana } from '../../../../common/lib/kibana';
import { alertReducer } from '../../alert_form/alert_reducer';
import { loadAllActions as loadConnectors } from '../../../lib/action_connector_api';

export type AlertDetailsProps = {
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
    application: { capabilities },
    ruleTypeRegistry,
    actionTypeRegistry,
    setBreadcrumbs,
    chrome,
    http,
  } = useKibana().services;
  const [{}, dispatch] = useReducer(alertReducer, { alert });
  const setInitialAlert = (value: Alert) => {
    dispatch({ command: { type: 'setAlert' }, payload: { key: 'alert', value } });
  };

  const [hasActionsWithBrokenConnector, setHasActionsWithBrokenConnector] =
    useState<boolean>(false);

  // Set breadcrumb and page title
  useEffect(() => {
    setBreadcrumbs([
      getAlertingSectionBreadcrumb('alerts'),
      getAlertDetailsBreadcrumb(alert.id, alert.name),
    ]);
    chrome.docTitle.change(getCurrentDocTitle('alerts'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Determine if any attached action has an issue with its connector
  useEffect(() => {
    (async () => {
      let loadedConnectors: ActionConnector[] = [];
      try {
        loadedConnectors = await loadConnectors({ http });
      } catch (err) {
        loadedConnectors = [];
      }

      if (loadedConnectors.length > 0) {
        const hasActionWithBrokenConnector = alert.actions.some(
          (action) => !loadedConnectors.find((connector) => connector.id === action.id)
        );
        if (setHasActionsWithBrokenConnector) {
          setHasActionsWithBrokenConnector(hasActionWithBrokenConnector);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canExecuteActions = hasExecuteActionsCapability(capabilities);
  const canSaveAlert =
    hasAllPrivilege(alert, alertType) &&
    // if the alert has actions, can the user save the alert's action params
    (canExecuteActions || (!canExecuteActions && alert.actions.length === 0));

  const actionTypesByTypeId = keyBy(actionTypes, 'id');
  const hasEditButton =
    // can the user save the alert
    canSaveAlert &&
    // is this alert type editable from within Alerts Management
    (ruleTypeRegistry.has(alert.alertTypeId)
      ? !ruleTypeRegistry.get(alert.alertTypeId).requiresAppContext
      : false);

  const alertActions = alert.actions;
  const uniqueActions = Array.from(new Set(alertActions.map((item: any) => item.actionTypeId)));
  const [isEnabled, setIsEnabled] = useState<boolean>(alert.enabled);
  const [isEnabledUpdating, setIsEnabledUpdating] = useState<boolean>(false);
  const [isMutedUpdating, setIsMutedUpdating] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(alert.muteAll);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
  const [dissmissAlertErrors, setDissmissAlertErrors] = useState<boolean>(false);

  const setAlert = async () => {
    history.push(routeToRuleDetails.replace(`:ruleId`, alert.id));
  };

  const getAlertStatusErrorReasonText = () => {
    if (alert.executionStatus.error && alert.executionStatus.error.reason) {
      return alertsErrorReasonTranslationsMapping[alert.executionStatus.error.reason];
    } else {
      return alertsErrorReasonTranslationsMapping.unknown;
    }
  };

  const rightPageHeaderButtons = hasEditButton
    ? [
        <>
          <EuiButtonEmpty
            data-test-subj="openEditAlertFlyoutButton"
            iconType="pencil"
            onClick={() => setEditFlyoutVisibility(true)}
            name="edit"
            disabled={!alertType.enabledInLicense}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertDetails.editAlertButtonLabel"
              defaultMessage="Edit"
            />
          </EuiButtonEmpty>
          {editFlyoutVisible && (
            <AlertEdit
              initialAlert={alert}
              onClose={() => {
                setInitialAlert(alert);
                setEditFlyoutVisibility(false);
              }}
              actionTypeRegistry={actionTypeRegistry}
              ruleTypeRegistry={ruleTypeRegistry}
              onSave={setAlert}
            />
          )}
        </>,
      ]
    : [];

  return (
    <>
      <EuiPageHeader
        data-test-subj="alertDetailsTitle"
        bottomBorder
        pageTitle={
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertDetails.alertDetailsTitle"
            defaultMessage="{alertName}"
            values={{ alertName: alert.name }}
          />
        }
        rightSideItems={[
          <ViewInApp alert={alert} />,
          <EuiButtonEmpty
            data-test-subj="refreshAlertsButton"
            iconType="refresh"
            onClick={requestRefresh}
            name="refresh"
            color="primary"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.refreshAlertsButtonLabel"
              defaultMessage="Refresh"
            />
          </EuiButtonEmpty>,
          ...rightPageHeaderButtons,
        ]}
      />
      <EuiSpacer size="l" />
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
              <>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.actionsTex"
                    defaultMessage="Actions"
                  />{' '}
                  {hasActionsWithBrokenConnector && (
                    <EuiIconTip
                      data-test-subj="actionWithBrokenConnector"
                      type="alert"
                      color="danger"
                      content={i18n.translate(
                        'xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.actionsWarningTooltip',
                        {
                          defaultMessage:
                            'Unable to load one of the connectors associated with this rule. Edit the rule to select a new connector.',
                        }
                      )}
                      position="right"
                    />
                  )}
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
              </>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSpacer />
            <EuiFlexGroup justifyContent="flexEnd" wrap responsive={false} gutterSize="m">
              <EuiFlexItem grow={false}>
                {isEnabledUpdating ? (
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiLoadingSpinner data-test-subj="enableSpinner" size="m" />
                    </EuiFlexItem>

                    <EuiFlexItem>
                      <EuiText size="s">
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.alertDetails.collapsedItemActons.enableLoadingTitle"
                          defaultMessage="Enable"
                        />
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : (
                  <EuiSwitch
                    name="enable"
                    disabled={!canSaveAlert || !alertType.enabledInLicense}
                    checked={isEnabled}
                    data-test-subj="enableSwitch"
                    onChange={async () => {
                      setIsEnabledUpdating(true);
                      if (isEnabled) {
                        setIsEnabled(false);
                        await disableAlert(alert);
                        // Reset dismiss if previously clicked
                        setDissmissAlertErrors(false);
                      } else {
                        setIsEnabled(true);
                        await enableAlert(alert);
                      }
                      requestRefresh();
                      setIsEnabledUpdating(false);
                    }}
                    label={
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.alertDetails.collapsedItemActons.enableTitle"
                        defaultMessage="Enable"
                      />
                    }
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {isMutedUpdating ? (
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiLoadingSpinner size="m" />
                    </EuiFlexItem>

                    <EuiFlexItem>
                      <EuiText size="s">
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.alertDetails.collapsedItemActons.muteLoadingTitle"
                          defaultMessage="Mute"
                        />
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : (
                  <EuiSwitch
                    name="mute"
                    checked={isMuted}
                    disabled={!canSaveAlert || !isEnabled || !alertType.enabledInLicense}
                    data-test-subj="muteSwitch"
                    onChange={async () => {
                      setIsMutedUpdating(true);
                      if (isMuted) {
                        setIsMuted(false);
                        await unmuteAlert(alert);
                      } else {
                        setIsMuted(true);
                        await muteAlert(alert);
                      }
                      requestRefresh();
                      setIsMutedUpdating(false);
                    }}
                    label={
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.alertDetails.collapsedItemActons.muteTitle"
                        defaultMessage="Mute"
                      />
                    }
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {alert.enabled && !dissmissAlertErrors && alert.executionStatus.status === 'error' ? (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut
                color="danger"
                data-test-subj="alertErrorBanner"
                size="s"
                title={getAlertStatusErrorReasonText()}
                iconType="alert"
              >
                <EuiText size="s" color="danger" data-test-subj="alertErrorMessageText">
                  {alert.executionStatus.error?.message}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" wrap={true}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="dismiss-execution-error"
                      color="danger"
                      onClick={() => setDissmissAlertErrors(true)}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.alertDetails.dismissButtonTitle"
                        defaultMessage="Dismiss"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                  {alert.executionStatus.error?.reason ===
                    AlertExecutionStatusErrorReasons.License && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        href={`${http.basePath.get()}/app/management/stack/license_management`}
                        color="danger"
                        target="_blank"
                      >
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.alertDetails.manageLicensePlanBannerLinkTitle"
                          defaultMessage="Manage license"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        {hasActionsWithBrokenConnector && (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiSpacer size="s" />
              <EuiCallOut
                color="warning"
                data-test-subj="actionWithBrokenConnectorWarningBanner"
                size="s"
                title={i18n.translate(
                  'xpack.triggersActionsUI.sections.alertDetails.actionWithBrokenConnectorWarningBannerTitle',
                  {
                    defaultMessage:
                      'There is an issue with one of the connectors associated with this rule.',
                  }
                )}
              >
                {hasEditButton && (
                  <EuiFlexGroup gutterSize="s" wrap={true}>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        data-test-subj="actionWithBrokenConnectorWarningBannerEdit"
                        color="warning"
                        onClick={() => setEditFlyoutVisibility(true)}
                      >
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.alertDetails.actionWithBrokenConnectorWarningBannerEditText"
                          defaultMessage="Edit rule"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <EuiFlexGroup>
          <EuiFlexItem>
            {alert.enabled ? (
              <AlertInstancesRouteWithApi
                requestRefresh={requestRefresh}
                alert={alert}
                alertType={alertType}
                readOnly={!canSaveAlert}
              />
            ) : (
              <>
                <EuiSpacer />
                <EuiPageTemplate template="empty">
                  <EuiEmptyPrompt
                    data-test-subj="disabledEmptyPrompt"
                    title={
                      <h2>
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.alertDetails.alerts.disabledRuleTitle"
                          defaultMessage="Disabled Rule"
                        />
                      </h2>
                    }
                    body={
                      <>
                        <p>
                          <FormattedMessage
                            id="xpack.triggersActionsUI.sections.alertDetails.alertInstances.disabledRule"
                            defaultMessage="This rule is disabled and cannot be displayed."
                          />
                        </p>
                      </>
                    }
                    actions={[
                      <EuiButton
                        data-test-subj="disabledEmptyPromptAction"
                        color="primary"
                        fill
                        disabled={isEnabledUpdating}
                        onClick={async () => {
                          setIsEnabledUpdating(true);
                          setIsEnabled(true);
                          await enableAlert(alert);
                          requestRefresh();
                          setIsEnabledUpdating(false);
                        }}
                      >
                        Enable
                      </EuiButton>,
                    ]}
                  />
                </EuiPageTemplate>
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageContentBody>
    </>
  );
};

export const AlertDetailsWithApi = withBulkAlertOperations(AlertDetails);
