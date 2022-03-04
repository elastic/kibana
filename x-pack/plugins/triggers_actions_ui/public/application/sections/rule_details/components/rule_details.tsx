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
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertExecutionStatusErrorReasons } from '../../../../../../alerting/common';
import { hasAllPrivilege, hasExecuteActionsCapability } from '../../../lib/capabilities';
import { getAlertingSectionBreadcrumb, getRuleDetailsBreadcrumb } from '../../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../../lib/doc_title';
import { Rule, RuleType, ActionType, ActionConnector } from '../../../../types';
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

export type RuleDetailsProps = {
  rule: Rule;
  ruleType: RuleType;
  actionTypes: ActionType[];
  requestRefresh: () => Promise<void>;
  refreshToken?: number;
} & Pick<BulkOperationsComponentOpts, 'disableRule' | 'enableRule' | 'unmuteRule' | 'muteRule'>;

export const RuleDetails: React.FunctionComponent<RuleDetailsProps> = ({
  rule,
  ruleType,
  actionTypes,
  disableRule,
  enableRule,
  unmuteRule,
  muteRule,
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
  } = useKibana().services;
  const [{}, dispatch] = useReducer(ruleReducer, { rule });
  const setInitialRule = (value: Rule) => {
    dispatch({ command: { type: 'setRule' }, payload: { key: 'rule', value } });
  };

  const [hasActionsWithBrokenConnector, setHasActionsWithBrokenConnector] =
    useState<boolean>(false);

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
  const [isEnabled, setIsEnabled] = useState<boolean>(rule.enabled);
  const [isEnabledUpdating, setIsEnabledUpdating] = useState<boolean>(false);
  const [isMutedUpdating, setIsMutedUpdating] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(rule.muteAll);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
  const [dismissRuleErrors, setDismissRuleErrors] = useState<boolean>(false);
  const [dismissRuleWarning, setDismissRuleWarning] = useState<boolean>(false);

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
        <EuiFlexGroup wrap responsive={false} gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.ruleTypeTitle"
                  defaultMessage="Type"
                />
              </p>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiBadge data-test-subj="ruleTypeLabel">{ruleType.name}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            {uniqueActions && uniqueActions.length ? (
              <>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.actionsTex"
                    defaultMessage="Actions"
                  />{' '}
                  {hasActionsWithBrokenConnector && (
                    <EuiIconTip
                      data-test-subj="actionWithBrokenConnector"
                      type="rule"
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
                          id="xpack.triggersActionsUI.sections.ruleDetails.collapsedItemActons.enableLoadingTitle"
                          defaultMessage="Enable"
                        />
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : (
                  <EuiSwitch
                    name="enable"
                    disabled={!canSaveRule || !ruleType.enabledInLicense}
                    checked={isEnabled}
                    data-test-subj="enableSwitch"
                    onChange={async () => {
                      setIsEnabledUpdating(true);
                      if (isEnabled) {
                        setIsEnabled(false);
                        await disableRule(rule);
                        // Reset dismiss if previously clicked
                        setDismissRuleErrors(false);
                      } else {
                        setIsEnabled(true);
                        await enableRule(rule);
                      }
                      requestRefresh();
                      setIsEnabledUpdating(false);
                    }}
                    label={
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.collapsedItemActons.enableTitle"
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
                          id="xpack.triggersActionsUI.sections.ruleDetails.collapsedItemActons.muteLoadingTitle"
                          defaultMessage="Mute"
                        />
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : (
                  <EuiSwitch
                    name="mute"
                    checked={isMuted}
                    disabled={!canSaveRule || !isEnabled || !ruleType.enabledInLicense}
                    data-test-subj="muteSwitch"
                    onChange={async () => {
                      setIsMutedUpdating(true);
                      if (isMuted) {
                        setIsMuted(false);
                        await unmuteRule(rule);
                      } else {
                        setIsMuted(true);
                        await muteRule(rule);
                      }
                      requestRefresh();
                      setIsMutedUpdating(false);
                    }}
                    label={
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.collapsedItemActons.muteTitle"
                        defaultMessage="Mute"
                      />
                    }
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {rule.enabled && !dismissRuleErrors && rule.executionStatus.status === 'error' ? (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut
                color="danger"
                data-test-subj="ruleErrorBanner"
                size="s"
                title={getRuleStatusErrorReasonText()}
                iconType="rule"
              >
                <EuiText size="s" color="danger" data-test-subj="ruleErrorMessageText">
                  {rule.executionStatus.error?.message}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" wrap={true}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="dismiss-execution-error"
                      color="danger"
                      onClick={() => setDismissRuleErrors(true)}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.dismissButtonTitle"
                        defaultMessage="Dismiss"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                  {rule.executionStatus.error?.reason ===
                    AlertExecutionStatusErrorReasons.License && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        href={`${http.basePath.get()}/app/management/stack/license_management`}
                        color="danger"
                        target="_blank"
                      >
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.ruleDetails.manageLicensePlanBannerLinkTitle"
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

        {rule.enabled && !dismissRuleWarning && rule.executionStatus.status === 'warning' ? (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut
                color="warning"
                data-test-subj="ruleWarningBanner"
                size="s"
                title={getRuleStatusWarningReasonText()}
                iconType="alert"
              >
                <EuiText size="s" color="warning" data-test-subj="ruleWarningMessageText">
                  {rule.executionStatus.warning?.message}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" wrap={true}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="dismiss-execution-warning"
                      color="warning"
                      onClick={() => setDismissRuleWarning(true)}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.dismissButtonTitle"
                        defaultMessage="Dismiss"
                      />
                    </EuiButton>
                  </EuiFlexItem>
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
                  'xpack.triggersActionsUI.sections.ruleDetails.actionWithBrokenConnectorWarningBannerTitle',
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
                          id="xpack.triggersActionsUI.sections.ruleDetails.actionWithBrokenConnectorWarningBannerEditText"
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
            {rule.enabled ? (
              <RuleRouteWithApi
                requestRefresh={requestRefresh}
                refreshToken={refreshToken}
                rule={rule}
                ruleType={ruleType}
                readOnly={!canSaveRule}
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
                          id="xpack.triggersActionsUI.sections.ruleDetails.alertInstances.disabledRuleTitle"
                          defaultMessage="Disabled Rule"
                        />
                      </h2>
                    }
                    body={
                      <>
                        <p>
                          <FormattedMessage
                            id="xpack.triggersActionsUI.sections.ruleDetails.alertInstances.disabledRule"
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
                          await enableRule(rule);
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

export const RuleDetailsWithApi = withBulkRuleOperations(RuleDetails);
