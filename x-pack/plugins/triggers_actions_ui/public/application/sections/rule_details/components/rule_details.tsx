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
  EuiCallOut,
  EuiSpacer,
  EuiButtonEmpty,
  EuiButton,
  EuiIconTip,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { RuleExecutionStatusErrorReasons, parseDuration } from '../../../../../../alerting/common';
import { hasAllPrivilege, hasExecuteActionsCapability } from '../../../lib/capabilities';
import { getAlertingSectionBreadcrumb, getRuleDetailsBreadcrumb } from '../../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../../lib/doc_title';
import {
  Rule,
  RuleType,
  ActionType,
  ActionConnector,
  TriggersActionsUiConfig,
  RuleTableItem,
} from '../../../../types';
import {
  ComponentOpts as BulkOperationsComponentOpts,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import { RuleRouteWithApi } from './rule_route';
import { ViewInApp } from './view_in_app';
import { RuleEdit } from '../../rule_form';
import { routeToRuleDetails } from '../../../constants';
import {
  rulesErrorReasonTranslationsMapping,
  rulesWarningReasonTranslationsMapping,
} from '../../rules_list/translations';
import { useKibana } from '../../../../common/lib/kibana';
import { ruleReducer } from '../../rule_form/rule_reducer';
import { loadAllActions as loadConnectors } from '../../../lib/action_connector_api';
import { triggersActionsUiConfig } from '../../../../common/lib/config_api';
import { RuleStatusDropdown } from '../../rules_list/components/rule_status_dropdown';

export type RuleDetailsProps = {
  rule: Rule;
  ruleType: RuleType;
  actionTypes: ActionType[];
  requestRefresh: () => Promise<void>;
  refreshToken?: number;
} & Pick<BulkOperationsComponentOpts, 'disableRule' | 'enableRule' | 'snoozeRule' | 'unsnoozeRule'>;

export const RuleDetails: React.FunctionComponent<RuleDetailsProps> = ({
  rule,
  ruleType,
  actionTypes,
  disableRule,
  enableRule,
  snoozeRule,
  unsnoozeRule,
  requestRefresh,
  refreshToken,
}) => {
  const history = useHistory();
  const {
    application: { capabilities },
    ruleTypeRegistry,
    actionTypeRegistry,
    setBreadcrumbs,
    chrome,
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [{}, dispatch] = useReducer(ruleReducer, { rule });
  const setInitialRule = (value: Rule) => {
    dispatch({ command: { type: 'setRule' }, payload: { key: 'rule', value } });
  };

  const [hasActionsWithBrokenConnector, setHasActionsWithBrokenConnector] =
    useState<boolean>(false);

  const [config, setConfig] = useState<TriggersActionsUiConfig>({});

  useEffect(() => {
    (async () => {
      setConfig(await triggersActionsUiConfig({ http }));
    })();
  }, [http]);

  // Set breadcrumb and page title
  useEffect(() => {
    setBreadcrumbs([
      getAlertingSectionBreadcrumb('rules'),
      getRuleDetailsBreadcrumb(rule.id, rule.name),
    ]);
    chrome.docTitle.change(getCurrentDocTitle('rules'));
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
        const hasActionWithBrokenConnector = rule.actions.some(
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
  const canSaveRule =
    hasAllPrivilege(rule, ruleType) &&
    // if the rule has actions, can the user save the rule's action params
    (canExecuteActions || (!canExecuteActions && rule.actions.length === 0));

  const actionTypesByTypeId = keyBy(actionTypes, 'id');
  const hasEditButton =
    // can the user save the rule
    canSaveRule &&
    // is this rule type editable from within Rules Management
    (ruleTypeRegistry.has(rule.ruleTypeId)
      ? !ruleTypeRegistry.get(rule.ruleTypeId).requiresAppContext
      : false);

  const ruleActions = rule.actions;
  const uniqueActions = Array.from(new Set(ruleActions.map((item: any) => item.actionTypeId)));
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);

  // Check whether interval is below configured minium
  useEffect(() => {
    if (rule.schedule.interval && config.minimumScheduleInterval) {
      if (
        parseDuration(rule.schedule.interval) < parseDuration(config.minimumScheduleInterval.value)
      ) {
        const configurationToast = toasts.addInfo({
          'data-test-subj': 'intervalConfigToast',
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.ruleDetails.scheduleIntervalToastTitle',
            {
              defaultMessage: 'Configuration settings',
            }
          ),
          text: toMountPoint(
            <>
              <p>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleDetails.scheduleIntervalToastMessage"
                  defaultMessage="This rule has an interval set below the minimum configured interval. This may impact performance."
                />
              </p>
              {hasEditButton && (
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="ruleIntervalToastEditButton"
                      onClick={() => {
                        toasts.remove(configurationToast);
                        setEditFlyoutVisibility(true);
                      }}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.scheduleIntervalToastMessageButton"
                        defaultMessage="Edit rule"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </>
          ),
        });
      }
    }
  }, [rule.schedule.interval, config.minimumScheduleInterval, toasts, hasEditButton]);

  const setRule = async () => {
    history.push(routeToRuleDetails.replace(`:ruleId`, rule.id));
  };

  const getRuleStatusErrorReasonText = () => {
    if (rule.executionStatus.error && rule.executionStatus.error.reason) {
      return rulesErrorReasonTranslationsMapping[rule.executionStatus.error.reason];
    } else {
      return rulesErrorReasonTranslationsMapping.unknown;
    }
  };

  const getRuleStatusWarningReasonText = () => {
    if (rule.executionStatus.warning && rule.executionStatus.warning.reason) {
      return rulesWarningReasonTranslationsMapping[rule.executionStatus.warning.reason];
    } else {
      return rulesWarningReasonTranslationsMapping.unknown;
    }
  };

  const rightPageHeaderButtons = hasEditButton
    ? [
        <>
          <EuiButtonEmpty
            data-test-subj="openEditRuleFlyoutButton"
            iconType="pencil"
            onClick={() => setEditFlyoutVisibility(true)}
            name="edit"
            disabled={!ruleType.enabledInLicense}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.editRuleButtonLabel"
              defaultMessage="Edit"
            />
          </EuiButtonEmpty>
          {editFlyoutVisible && (
            <RuleEdit
              initialRule={rule}
              onClose={() => {
                setInitialRule(rule);
                setEditFlyoutVisibility(false);
              }}
              actionTypeRegistry={actionTypeRegistry}
              ruleTypeRegistry={ruleTypeRegistry}
              ruleType={ruleType}
              onSave={setRule}
            />
          )}
        </>,
      ]
    : [];

  return (
    <>
      <EuiPageHeader
        data-test-subj="ruleDetailsTitle"
        bottomBorder
        pageTitle={
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleDetails.ruleDetailsTitle"
            defaultMessage="{ruleName}"
            values={{ ruleName: rule.name }}
          />
        }
        description={
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <p>
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.stateTitle"
                        defaultMessage="State"
                      />
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <RuleStatusDropdown
                    disableRule={async () => await disableRule(rule)}
                    enableRule={async () => await enableRule(rule)}
                    snoozeRule={async (snoozeEndTime: string | -1) =>
                      await snoozeRule(rule, snoozeEndTime)
                    }
                    unsnoozeRule={async () => await unsnoozeRule(rule)}
                    rule={rule as RuleTableItem}
                    onRuleChanged={requestRefresh}
                    direction="row"
                    isEditable={hasEditButton}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <p>
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.ruleTypeTitle"
                        defaultMessage="Type"
                      />
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge data-test-subj="ruleTypeLabel">{ruleType.name}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {uniqueActions && uniqueActions.length ? (
                <EuiFlexGroup responsive={false} gutterSize="xs">
                  <EuiFlexItem>
                    <EuiText size="s">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.actionsTex"
                        defaultMessage="Actions"
                      />{' '}
                      {hasActionsWithBrokenConnector && (
                        <EuiIconTip
                          data-test-subj="actionWithBrokenConnector"
                          type="alert"
                          color="danger"
                          content={i18n.translate(
                            'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.actionsWarningTooltip',
                            {
                              defaultMessage:
                                'Unable to load one of the connectors associated with this rule. Edit the rule to select a new connector.',
                            }
                          )}
                          position="right"
                        />
                      )}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup gutterSize="xs">
                      {uniqueActions.map((action, index) => (
                        <EuiFlexItem key={index} grow={false}>
                          <EuiBadge color="hollow" data-test-subj="actionTypeLabel">
                            {actionTypesByTypeId[action].name ?? action}
                          </EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        rightSideItems={[
          <ViewInApp rule={rule} />,
          <EuiButtonEmpty
            data-test-subj="refreshRulesButton"
            iconType="refresh"
            onClick={requestRefresh}
            name="refresh"
            color="primary"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.rulesList.refreshRulesButtonLabel"
              defaultMessage="Refresh"
            />
          </EuiButtonEmpty>,
          ...rightPageHeaderButtons,
        ]}
      />
      <EuiSpacer size="l" />
      <EuiPageContentBody>
        {rule.enabled &&
        rule.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License ? (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut color="danger" data-test-subj="ruleErrorBanner" size="s" iconType="rule">
                <p>
                  <EuiIcon color="danger" type="alert" />
                  &nbsp;
                  <b>{getRuleStatusErrorReasonText()}</b>&#44;&nbsp;
                  {rule.executionStatus.error?.message}
                  &nbsp;
                  <EuiLink
                    href={`${http.basePath.get()}/app/management/stack/license_management`}
                    color="primary"
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleDetails.manageLicensePlanBannerLinkTitle"
                      defaultMessage="Manage license"
                    />
                  </EuiLink>
                </p>
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}

        {rule.enabled && rule.executionStatus.status === 'warning' ? (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut
                color="warning"
                data-test-subj="ruleWarningBanner"
                size="s"
                iconType="alert"
              >
                <p>
                  <EuiIcon color="warning" type="alert" />
                  &nbsp;
                  {getRuleStatusWarningReasonText()}
                  &nbsp;
                  {rule.executionStatus.warning?.message}
                </p>
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
              >
                <p>
                  <EuiIcon color="warning" type="alert" />
                  &nbsp;
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleDetails.actionWithBrokenConnectorWarningBannerTitle"
                    defaultMessage="There is an issue with one of the connectors associated with this rule."
                  />
                  &nbsp;
                  {hasEditButton && (
                    <EuiLink
                      data-test-subj="actionWithBrokenConnectorWarningBannerEdit"
                      color="primary"
                      onClick={() => setEditFlyoutVisibility(true)}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.actionWithBrokenConnectorWarningBannerEditText"
                        defaultMessage="Edit rule"
                      />
                    </EuiLink>
                  )}
                </p>
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <EuiFlexGroup>
          <EuiFlexItem>
            <RuleRouteWithApi
              requestRefresh={requestRefresh}
              refreshToken={refreshToken}
              rule={rule}
              ruleType={ruleType}
              readOnly={!canSaveRule}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageContentBody>
    </>
  );
};

export const RuleDetailsWithApi = withBulkRuleOperations(RuleDetails);
