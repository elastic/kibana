/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { euiThemeVars } from '@kbn/ui-theme';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { RulesParams } from '../../../locators/rules';

export interface RuleStatsState {
  total: number;
  disabled: number;
  muted: number;
  error: number;
  snoozed: number;
}
type Status = 'disabled' | 'snoozed' | 'error';

const Divider = euiStyled.div`
  border-right: 1px solid ${euiThemeVars.euiColorLightShade};
  height: 100%;
`;

const StyledStat = euiStyled(EuiStat)`
  .euiText {
    line-height: 1;
  }
`;

const ConditionalWrap = ({
  condition,
  wrap,
  children,
}: {
  condition: boolean;
  wrap: (wrappedChildren: React.ReactNode) => JSX.Element;
  children: JSX.Element;
}): JSX.Element => (condition ? wrap(children) : children);

const getStatCount = (stats: RuleStatsState, status: Status) => {
  if (status === 'snoozed') return stats.snoozed + stats.muted;
  return stats[status];
};

const disabledLabel = i18n.translate('xpack.observability.alerts.ruleStats.disabled', {
  defaultMessage: 'Disabled',
});
const snoozedLabel = i18n.translate('xpack.observability.alerts.ruleStats.muted', {
  defaultMessage: 'Snoozed',
});
const errorsLabel = i18n.translate('xpack.observability.alerts.ruleStats.errors', {
  defaultMessage: 'Errors',
});

export const renderRuleStats = (
  ruleStats: RuleStatsState,
  manageRulesHref: string,
  ruleStatsLoading: boolean,
  rulesLocator?: LocatorPublic<RulesParams>
) => {
  const handleNavigateToRules = async (stats: RuleStatsState, status: Status) => {
    const count = getStatCount(stats, status);
    if (count > 0) {
      switch (status) {
        case 'error':
          await rulesLocator?.navigate({ lastResponse: ['failed'] }, { replace: false });
          break;
        case 'snoozed':
        case 'disabled':
          await rulesLocator?.navigate({ status: [status] }, { replace: false });
          break;
        default:
          break;
      }
    }
  };

  const disabledStatsComponent = (
    <ConditionalWrap
      condition={ruleStats.disabled > 0}
      wrap={(wrappedChildren) => (
        <EuiButtonEmpty
          aria-label={disabledLabel}
          data-test-subj="o11yDisabledStatsComponentButton"
          onClick={() => handleNavigateToRules(ruleStats, 'disabled')}
        >
          {wrappedChildren}
        </EuiButtonEmpty>
      )}
    >
      <StyledStat
        title={ruleStats.disabled}
        description={disabledLabel}
        color="primary"
        titleColor={ruleStats.disabled > 0 ? 'primary' : ''}
        titleSize="xs"
        isLoading={ruleStatsLoading}
        data-test-subj="statDisabled"
      />
    </ConditionalWrap>
  );

  const snoozedStatsComponent = (
    <ConditionalWrap
      condition={ruleStats.muted + ruleStats.snoozed > 0}
      wrap={(wrappedChildren) => (
        <EuiButtonEmpty
          aria-label={snoozedLabel}
          data-test-subj="o11ySnoozedStatsComponentButton"
          onClick={() => handleNavigateToRules(ruleStats, 'snoozed')}
        >
          {wrappedChildren}
        </EuiButtonEmpty>
      )}
    >
      <StyledStat
        title={ruleStats.muted + ruleStats.snoozed}
        description={snoozedLabel}
        color="primary"
        titleColor={ruleStats.muted + ruleStats.snoozed > 0 ? 'primary' : ''}
        titleSize="xs"
        isLoading={ruleStatsLoading}
        data-test-subj="statMuted"
      />
    </ConditionalWrap>
  );

  const errorStatsComponent = (
    <ConditionalWrap
      condition={ruleStats.error > 0}
      wrap={(wrappedChildren) => (
        <EuiButtonEmpty
          aria-label={errorsLabel}
          data-test-subj="o11yErrorStatsComponentButton"
          onClick={() => handleNavigateToRules(ruleStats, 'error')}
        >
          {wrappedChildren}
        </EuiButtonEmpty>
      )}
    >
      <StyledStat
        title={ruleStats.error}
        description={errorsLabel}
        color="primary"
        titleColor={ruleStats.error > 0 ? 'primary' : ''}
        titleSize="xs"
        isLoading={ruleStatsLoading}
        data-test-subj="statErrors"
      />
    </ConditionalWrap>
  );
  return [
    <StyledStat
      title={ruleStats.total}
      description={i18n.translate('xpack.observability.alerts.ruleStats.ruleCount', {
        defaultMessage: 'Rule count',
      })}
      color="primary"
      titleSize="xs"
      isLoading={ruleStatsLoading}
      data-test-subj="statRuleCount"
    />,
    disabledStatsComponent,
    snoozedStatsComponent,
    errorStatsComponent,
    <Divider />,
    <EuiButtonEmpty data-test-subj="manageRulesPageButton" href={manageRulesHref}>
      {i18n.translate('xpack.observability.alerts.manageRulesButtonLabel', {
        defaultMessage: 'Manage Rules',
      })}
    </EuiButtonEmpty>,
  ].reverse();
};
