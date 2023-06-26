/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiStat, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useKibana } from '../../../utils/kibana_react';
import { paths } from '../../../routes/paths';

export interface Stats {
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

const ConditionalWrap = ({
  condition,
  wrap,
  children,
}: {
  condition: boolean;
  wrap: (wrappedChildren: React.ReactNode) => JSX.Element;
  children: JSX.Element;
}): JSX.Element => (condition ? wrap(children) : children);

interface Props {
  ruleStats: Stats;
  isLoading: boolean;
}

export function RuleStats({ ruleStats, isLoading }: Props) {
  const {
    http: { basePath },
  } = useKibana().services;

  const createRuleStatsLink = (stats: Stats, statType: StatType) => {
    const count = statType === 'snoozed' ? stats.snoozed + stats.muted : stats[statType];

    let searchParams = `?_a=(lastResponse:!(),status:!())`;

    if (count > 0) {
      switch (statType) {
        case 'error':
          searchParams = `?_a=(lastResponse:!(error),status:!())`;
          break;
        case 'snoozed':
        case 'disabled':
          searchParams = `?_a=(lastResponse:!(),status:!(${statType}))`;
          break;
        default:
          break;
      }
    }
    return basePath.prepend(`${paths.observability.rules}${searchParams}`);
  };

  return (
    <EuiFlexGroup>
      <EuiStat
        color="primary"
        data-test-subj="statRuleCount"
        description={i18n.translate('xpack.observability.alerts.ruleStats.ruleCount', {
          defaultMessage: 'Rule count',
        })}
        isLoading={isLoading}
        title={ruleStats.total}
        titleSize="xs"
      />

      <ConditionalWrap
        condition={ruleStats.disabled > 0}
        wrap={(wrappedChildren) => (
          <EuiButtonEmpty
            data-test-subj="o11yDisabledStatsComponentButton"
            href={createRuleStatsLink(ruleStats, 'disabled')}
          >
            {wrappedChildren}
          </EuiButtonEmpty>
        )}
      >
        <EuiStat
          color="primary"
          data-test-subj="statDisabled"
          description={i18n.translate('xpack.observability.alerts.ruleStats.disabled', {
            defaultMessage: 'Disabled',
          })}
          isLoading={isLoading}
          title={ruleStats.disabled}
          titleColor={ruleStats.disabled > 0 ? 'primary' : ''}
          titleSize="xs"
        />
      </ConditionalWrap>

      <ConditionalWrap
        condition={ruleStats.muted + ruleStats.snoozed > 0}
        wrap={(wrappedChildren) => (
          <EuiButtonEmpty
            data-test-subj="o11ySnoozedStatsComponentButton"
            href={createRuleStatsLink(ruleStats, 'snoozed')}
          >
            {wrappedChildren}
          </EuiButtonEmpty>
        )}
      >
        <EuiStat
          data-test-subj="statMuted"
          description={i18n.translate('xpack.observability.alerts.ruleStats.muted', {
            defaultMessage: 'Snoozed',
          })}
          color="primary"
          isLoading={isLoading}
          title={ruleStats.muted + ruleStats.snoozed}
          titleColor={ruleStats.muted + ruleStats.snoozed > 0 ? 'primary' : ''}
          titleSize="xs"
        />
      </ConditionalWrap>

      <ConditionalWrap
        condition={ruleStats.error > 0}
        wrap={(wrappedChildren) => (
          <EuiButtonEmpty
            data-test-subj="o11yErrorStatsComponentButton"
            href={createRuleStatsLink(ruleStats, 'error')}
          >
            {wrappedChildren}
          </EuiButtonEmpty>
        )}
      >
        <EuiStat
          color="primary"
          data-test-subj="statErrors"
          description={i18n.translate('xpack.observability.alerts.ruleStats.errors', {
            defaultMessage: 'Errors',
          })}
          isLoading={isLoading}
          title={ruleStats.error}
          titleColor={ruleStats.error > 0 ? 'primary' : ''}
          titleSize="xs"
        />
      </ConditionalWrap>

      <Divider />

      <EuiButtonEmpty
        data-test-subj="manageRulesPageButton"
        href={basePath.prepend(paths.observability.rules)}
      >
        {i18n.translate('xpack.observability.alerts.manageRulesButtonLabel', {
          defaultMessage: 'Manage Rules',
        })}
      </EuiButtonEmpty>
    </EuiFlexGroup>
  );
}
