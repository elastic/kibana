/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
  EuiPanel,
  EuiTitle,
  EuiHealth,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

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
      {rule.name} <ExperimentalBadge />
      <EuiPanel hasShadow={false} hasBorder={false}>
        <EuiFlexGroup alignItems="baseline">
          <EuiText color="subdued" size="s">
            <b>Last updated</b> by {rule.updatedBy} on {rule.updatedAt} &emsp;
            <b>Created</b> by {rule.createdBy} on {rule.createdAt} &emsp;
          </EuiText>

          <EuiPanel grow={false} hasShadow={false} hasBorder={true} paddingSize={'none'}>
            <EuiButtonEmpty iconType="tag" color="text">
              {rule.tags.length}
            </EuiButtonEmpty>
          </EuiPanel>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
}
interface RuleDetailsPathParams {
  ruleId: string;
}
export function RuleDetailsPage() {
  const {
    http,
    triggersActionsUi: { ruleTypeRegistry },
  } = useKibana().services;

  const { ruleId } = useParams<RuleDetailsPathParams>();
  const { ObservabilityPageTemplate } = usePluginContext();
  const { isLoading, rule, error } = useFetchRule({ ruleId });

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

  const {
    executionStatus: { status, lastExecutionDate },
    ruleTypeId,
    params,
    schedule: { interval },
    notifyWhen,
    actions,
  } = rule;
  const { description } = ruleTypeRegistry.get(rule?.ruleTypeId);
  console.log(rule);
  return (
    rule &&
    !error && (
      <ObservabilityPageTemplate
        pageHeader={{
          pageTitle: PageTitle(rule),
          bottomBorder: false,
        }}
      >
        <EuiFlexGroup>
          {/* Left side of Rule Summary */}
          <EuiFlexItem grow={1}>
            <EuiPanel color={getColorStatusBased(status)} hasBorder={false} paddingSize={'l'}>
              <EuiFlexGroup direction="column">
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiTitle size="m">
                      <EuiHealth textSize="inherit" color={getColorStatusBased(status)}>
                        {status}
                      </EuiHealth>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="l" />

                <EuiFlexGroup>
                  <EuiFlexItem>
                    {i18n.translate('xpack.observability.ruleDetails.lastRun', {
                      defaultMessage: 'Last Run ',
                    })}
                  </EuiFlexItem>
                  <EuiFlexItem>{lastExecutionDate}</EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="l" />

                <EuiFlexGroup>
                  <EuiFlexItem>
                    {i18n.translate('xpack.observability.ruleDetails.last24hAlerts', {
                      defaultMessage: 'Alerts (last 24 h)',
                    })}
                  </EuiFlexItem>
                  <EuiFlexItem>{0} - TODO</EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="l" />

                <EuiFlexGroup>
                  <EuiFlexItem>
                    {i18n.translate('xpack.observability.ruleDetails.last25hExecution', {
                      defaultMessage: 'Executions (last 24 h)',
                    })}
                  </EuiFlexItem>
                  <EuiFlexItem>{0} - TODO</EuiFlexItem>
                </EuiFlexGroup>
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

              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      {i18n.translate('xpack.observability.ruleDetails.ruleType', {
                        defaultMessage: 'Rule type',
                      })}
                    </EuiFlexItem>
                    <EuiFlexItem>{ruleTypeId}</EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiSpacer size="l" />

                  <EuiFlexGroup>
                    <EuiFlexItem>
                      {i18n.translate('xpack.observability.ruleDetails.description', {
                        defaultMessage: 'Description',
                      })}
                    </EuiFlexItem>
                    <EuiFlexItem>{description}</EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiSpacer size="l" />

                  <EuiFlexGroup>
                    <EuiFlexItem>
                      {i18n.translate('xpack.observability.ruleDetails.conditions', {
                        defaultMessage: 'Conditions',
                      })}
                    </EuiFlexItem>
                    <EuiFlexItem>{(params.criteria as any[]).length}</EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiSpacer size="l" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      {i18n.translate('xpack.observability.ruleDetails.runsEvery', {
                        defaultMessage: 'Runs every',
                      })}
                    </EuiFlexItem>
                    <EuiFlexItem>{interval}</EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiSpacer size="l" />

                  <EuiFlexGroup>
                    <EuiFlexItem>
                      {i18n.translate('xpack.observability.ruleDetails.notifyWhen', {
                        defaultMessage: 'Notify',
                      })}
                    </EuiFlexItem>
                    <EuiFlexItem>{notifyWhen}</EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiSpacer size="l" />
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      {i18n.translate('xpack.observability.ruleDetails.actions', {
                        defaultMessage: 'Actions',
                      })}
                    </EuiFlexItem>
                    <EuiFlexItem>{actions.length}</EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ObservabilityPageTemplate>
    )
  );
}
