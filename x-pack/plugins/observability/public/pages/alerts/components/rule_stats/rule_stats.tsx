/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

interface RuleStatsState {
  total: number;
  disabled: number;
  muted: number;
  error: number;
  snoozed: number;
}
type StatType = 'disabled' | 'snoozed' | 'error';

const Divider = euiStyled.div`
  border-right: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
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

const getStatCount = (stats: RuleStatsState, statType: StatType) => {
  if (statType === 'snoozed') return stats.snoozed + stats.muted;
  return stats[statType];
};

export const renderRuleStats = (
  ruleStats: RuleStatsState,
  manageRulesHref: string,
  ruleStatsLoading: boolean
) => {
  const createRuleStatsLink = (stats: RuleStatsState, statType: StatType) => {
    const count = getStatCount(stats, statType);
    let statsLink = `${manageRulesHref}?_a=(lastResponse:!(),status:!())`;
    if (count > 0) {
      switch (statType) {
        case 'error':
          statsLink = `${manageRulesHref}?_a=(lastResponse:!(error),status:!())`;
          break;
        case 'snoozed':
        case 'disabled':
          statsLink = `${manageRulesHref}?_a=(lastResponse:!(),status:!(${statType}))`;
          break;
        default:
          break;
      }
    }
    return statsLink;
  };

  const disabledStatsComponent = (
    <ConditionalWrap
      condition={ruleStats.disabled > 0}
      wrap={(wrappedChildren) => (
        <EuiButtonEmpty href={createRuleStatsLink(ruleStats, 'disabled')}>
          {wrappedChildren}
        </EuiButtonEmpty>
      )}
    >
      <StyledStat
        title={ruleStats.disabled}
        description={i18n.translate('xpack.observability.alerts.ruleStats.disabled', {
          defaultMessage: 'Disabled',
        })}
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
        <EuiButtonEmpty href={createRuleStatsLink(ruleStats, 'snoozed')}>
          {wrappedChildren}
        </EuiButtonEmpty>
      )}
    >
      <StyledStat
        title={ruleStats.muted + ruleStats.snoozed}
        description={i18n.translate('xpack.observability.alerts.ruleStats.muted', {
          defaultMessage: 'Snoozed',
        })}
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
        <EuiButtonEmpty href={createRuleStatsLink(ruleStats, 'error')}>
          {wrappedChildren}
        </EuiButtonEmpty>
      )}
    >
      <StyledStat
        title={ruleStats.error}
        description={i18n.translate('xpack.observability.alerts.ruleStats.errors', {
          defaultMessage: 'Errors',
        })}
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
