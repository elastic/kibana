/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import moment from 'moment';

import { useParams } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonIcon,
  EuiIcon,
  EuiPanel,
  EuiTitle,
  EuiHealth,
  EuiPopover,
  EuiContextMenu,
  EuiFlexGrid,
  EuiHorizontalRule,
  EuiStat,
  IconType,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
// import { hasExecuteActionsCapability } from './config';
import { RuleExecutionStatusValues } from '../../../../alerting/common';

import { Rule } from '../../../../triggers_actions_ui/public';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { RULES_BREADCRUMB_TEXT } from '../rules/translations';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { useKibana } from '../../utils/kibana_react';

function PageTitle(rule: Rule) {
  return (
    <>
      {/* TODO: Add return back to rule navigation button */}
      {rule.name} <ExperimentalBadge />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem component="span" grow={false}>
          {/* TODO: formate dates */}
          <EuiText color="subdued" size="s">
            <b>Last updated</b> by {rule.updatedBy} on {rule.updatedAt} &emsp;
            <b>Created</b> by {rule.createdBy} on {rule.createdAt}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem style={{ alignSelf: 'flexStart' }} component="span" grow={false}>
          <EuiPanel hasShadow={false} hasBorder={true} paddingSize={'none'}>
            <EuiButtonEmpty iconType="tag" color="text">
              {rule.tags.length}
            </EuiButtonEmpty>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

interface ItemTitleRuleSummaryProps {
  translationKey: string;
  defaultMessage: string;
}

function ItemTitleRuleSummary({ translationKey, defaultMessage }: ItemTitleRuleSummaryProps) {
  return (
    <EuiTitle size="xs">
      <EuiFlexItem grow={1}>
        {i18n.translate(translationKey, {
          defaultMessage,
        })}
      </EuiFlexItem>
    </EuiTitle>
  );
}
interface ItemValueRuleSummaryProps {
  itemValue: string;
  extraSpace?: boolean;
}

function ItemValueRuleSummary({ itemValue, extraSpace = true }: ItemValueRuleSummaryProps) {
  return (
    <EuiFlexItem grow={extraSpace ? 3 : 1}>
      <EuiText size="m">{itemValue}</EuiText>
    </EuiFlexItem>
  );
}
interface RuleDetailsPathParams {
  ruleId: string;
}
export function RuleDetailsPage() {
  const {
    http,
    triggersActionsUi: { ruleTypeRegistry },
    application: { capabilities },
    triggersActionsUi,
  } = useKibana().services;

  const { ruleId } = useParams<RuleDetailsPathParams>();
  const { ObservabilityPageTemplate } = usePluginContext();
  const { isLoading, rule, error, reload } = useFetchRule({ ruleId });
  const [editFlyoutVisible, setEditFlyoutVisible] = useState<boolean>(false);
  const [isRuleEditPopoverOpen, setIsRuleEditPopoverOpen] = useState(false);

  const getColorStatusBased = (ruleStatus: string) => {
    switch (ruleStatus) {
      case RuleExecutionStatusValues[0]:
        return 'primary';
      case RuleExecutionStatusValues[1]:
        return 'success';
      case RuleExecutionStatusValues[2]:
        return 'danger';
      case RuleExecutionStatusValues[3]:
        return 'warning';
      case RuleExecutionStatusValues[4]:
        return 'subdued';
      default:
        return 'subdued';
    }
  };

  interface ActionsComponentProps {
    actions: any[];
  }
  interface MapActionTypeIcon {
    [key: string]: string | IconType;
  }
  const mapActionTypeIcon: MapActionTypeIcon = {
    /* TODO:  Add the rest of the application logs (SVGs ones) */
    '.server-log': 'logsApp',
    '.email': 'email',
    '.pagerduty': 'apps',
    '.index': 'indexOpen',
    '.slack': 'logoSlack',
    '.webhook': 'logoWebhook',
  };

  function ActionsComponent({ actions }: ActionsComponentProps) {
    if (actions.length <= 0) return <EuiText size="m">0</EuiText>;

    const uniqueActions = Array.from(new Set(actions.map((action: any) => action.actionTypeId)));
    return (
      <EuiFlexGroup direction="column">
        {uniqueActions.map((actionTypeId) => (
          <>
            <EuiFlexGroup alignItems="flexStart">
              <EuiFlexItem grow={false}>
                <EuiIcon size="l" type={mapActionTypeIcon[actionTypeId] ?? 'apps'} />
              </EuiFlexItem>
              <EuiFlexItem>
                {/* TODO: Get the user-typed connector name?  */}
                <EuiText size="m">{actionTypeId}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        ))}
      </EuiFlexGroup>
    );
  }

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend('/app/observability/alerts/'),
    },
    {
      href: http.basePath.prepend('/app/observability/alerts/rules'),
      text: RULES_BREADCRUMB_TEXT,
    },
    {
      text: rule && rule.name,
    },
  ]);

  if (!rule || error) {
    return <EuiFlexItem>Error | No data</EuiFlexItem>;
  }
  const EditAlertFlyout = () =>
    useMemo(
      () =>
        triggersActionsUi.getEditAlertFlyout({
          initialRule: rule,
          onClose: () => {
            setEditFlyoutVisible(false);
          },
          onSave: reload,
        }),
      []
    );
  const isRuleTypeEditableInContext = (ruleTypeId: string) =>
    ruleTypeRegistry.has(ruleTypeId) ? !ruleTypeRegistry.get(ruleTypeId).requiresAppContext : false;

  const {
    executionStatus: { status, lastExecutionDate },
    ruleTypeId,
    params,
    schedule: { interval },
    notifyWhen,
    actions,
  } = rule;

  const { description } = ruleTypeRegistry.get(rule?.ruleTypeId);

  // console.log('uniqueActions', uniqueActions);

  console.log(rule);
  console.log('editFlyoutVisible', editFlyoutVisible);

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: PageTitle(rule),
        bottomBorder: false,
        rightSideItems: isRuleTypeEditableInContext(ruleTypeId)
          ? [
              <>
                <EuiPopover
                  id="contextRuleEditMenu"
                  isOpen={isRuleEditPopoverOpen}
                  closePopover={() => setIsRuleEditPopoverOpen(false)}
                  button={
                    <EuiButtonIcon
                      display="base"
                      size="m"
                      iconType="boxesHorizontal"
                      aria-label="More"
                      onClick={() => setIsRuleEditPopoverOpen(true)}
                    />
                  }
                >
                  <EuiButtonEmpty
                    size="m"
                    iconType="pencil"
                    onClick={() => {
                      setIsRuleEditPopoverOpen(false);
                      setEditFlyoutVisible(true);
                    }}
                  >
                    <EuiText size="m">
                      {i18n.translate('xpack.observability.ruleDetails.editRule', {
                        defaultMessage: 'Edit rule',
                      })}
                    </EuiText>
                  </EuiButtonEmpty>
                </EuiPopover>
              </>,
            ]
          : [],
      }}
    >
      <EuiFlexGroup>
        {/* Left side of Rule Summary */}
        <EuiFlexItem grow={1}>
          <EuiPanel color={getColorStatusBased(status)} hasBorder={false} paddingSize={'l'}>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiTitle size="m">
                  <EuiHealth textSize="inherit" color={getColorStatusBased(status)}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </EuiHealth>
                </EuiTitle>
              </EuiFlexItem>
              <EuiSpacer size="l" />
              <EuiFlexGroup>
                <ItemTitleRuleSummary
                  translationKey="xpack.observability.ruleDetails.lastRun"
                  defaultMessage="Last Run"
                />
                <ItemValueRuleSummary
                  extraSpace={false}
                  itemValue={moment(lastExecutionDate).fromNow()}
                />
              </EuiFlexGroup>
              <EuiSpacer size="xl" />

              <EuiHorizontalRule margin="none" />
              <EuiSpacer size="s" />

              <EuiFlexGroup>
                <ItemTitleRuleSummary
                  translationKey="xpack.observability.ruleDetails.last24hAlerts"
                  defaultMessage="Alerts (last 24 h)"
                />
                <ItemValueRuleSummary extraSpace={false} itemValue={'TODO'} />
              </EuiFlexGroup>
              <EuiSpacer size="l" />
              <EuiSpacer size="l" />
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>

        {/* Right side of Rule Summary */}

        <EuiFlexItem grow={3}>
          <EuiPanel color="subdued" hasBorder={false} paddingSize={'l'}>
            <EuiTitle>
              <EuiFlexItem>
                {i18n.translate('xpack.observability.ruleDetails.definition', {
                  defaultMessage: 'Definition',
                })}
              </EuiFlexItem>
            </EuiTitle>

            <EuiSpacer size="l" />

            <EuiFlexGroup alignItems="baseline">
              <EuiFlexItem>
                <EuiFlexGroup>
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.ruleType"
                    defaultMessage="Rule type"
                  />
                  <ItemValueRuleSummary itemValue={ruleTypeId} />
                </EuiFlexGroup>

                <EuiSpacer size="l" />

                <EuiFlexGroup alignItems="flexStart">
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.description"
                    defaultMessage="Description"
                  />
                  <ItemValueRuleSummary itemValue={description} />
                </EuiFlexGroup>

                <EuiSpacer size="l" />

                <EuiFlexGroup justifyContent="flexStart">
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.conditions"
                    defaultMessage="Conditions"
                  />
                  <EuiFlexItem grow={3}>
                    <EuiText size="m">
                      <EuiButtonEmpty onClick={() => setEditFlyoutVisible(true)}>
                        {String((params.criteria as any[]).length)}{' '}
                        {/* TODO:  Add [s] to the conditions word based on how many conditions */}
                        {i18n.translate('xpack.observability.ruleDetails.conditions', {
                          defaultMessage: 'conditions',
                        })}
                      </EuiButtonEmpty>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="l" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.runsEvery"
                    defaultMessage="Runs every"
                  />

                  {/* TODO:  format interval*/}
                  <ItemValueRuleSummary itemValue={interval} />
                </EuiFlexGroup>

                <EuiSpacer size="l" />

                <EuiFlexGroup>
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.notifyWhen"
                    defaultMessage="Notify"
                  />

                  <ItemValueRuleSummary itemValue={String(notifyWhen)} />
                </EuiFlexGroup>

                <EuiSpacer size="l" />
                <EuiFlexGroup alignItems="baseline">
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.actions"
                    defaultMessage="Actions"
                  />
                  <EuiFlexItem grow={3}>
                    <ActionsComponent actions={actions} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      {editFlyoutVisible && <EditAlertFlyout />}
    </ObservabilityPageTemplate>
  );
}
