/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiStat } from '@elastic/eui';
import styled from '@emotion/styled';
import { euiThemeVars } from '@kbn/ui-theme';
import { loadRuleAggregations, useKibana } from '../../../..';

const Stat = styled(EuiStat)`
  .euiText {
    line-height: 1;
  }
`;

const Divider = styled.div`
  border-right: 1px solid ${euiThemeVars.euiColorLightShade};
  height: 100%;
`;

interface Props {
  ruleTypeIds?: string[];
  consumers?: string[];
}

export const useRuleStats = ({ ruleTypeIds, consumers }: Props = {}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState({
    total: 0,
    disabled: 0,
    muted: 0,
    error: 0,
    snoozed: 0,
  });
  const manageRulesHref = useMemo(
    () => http.basePath.prepend('/app/management/insightsAndAlerting/triggersActions/rules'),
    [http.basePath]
  );

  const loadRuleStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await loadRuleAggregations({
        http,
        ruleTypeIds,
        consumers,
      });

      const { ruleExecutionStatus, ruleMutedStatus, ruleEnabledStatus, ruleSnoozedStatus } =
        response;
      if (ruleExecutionStatus && ruleMutedStatus && ruleEnabledStatus && ruleSnoozedStatus) {
        const total = Object.values(ruleExecutionStatus).reduce((acc, value) => acc + value, 0);
        const { disabled } = ruleEnabledStatus;
        const { muted } = ruleMutedStatus;
        const { error } = ruleExecutionStatus;
        const { snoozed } = ruleSnoozedStatus;
        setStats((oldStats) => ({
          ...oldStats,
          total,
          disabled,
          muted,
          error,
          snoozed,
        }));
      }
    } catch (_e) {
      toasts.addDanger({
        title: i18n.translate('xpack.triggersActionsUI.globalAlerts.alertStats.loadError', {
          defaultMessage: 'Unable to load rule stats',
        }),
      });
    } finally {
      setLoading(false);
    }
  }, [consumers, http, ruleTypeIds, toasts]);

  useEffect(() => {
    loadRuleStats();
  }, [loadRuleStats]);

  return useMemo(() => {
    const disabledStatsComponent = (
      <Stat
        title={stats.disabled}
        description={i18n.translate('xpack.triggersActionsUI.globalAlerts.alertStats.disabled', {
          defaultMessage: 'Disabled',
        })}
        color="primary"
        titleColor={stats.disabled > 0 ? 'primary' : ''}
        titleSize="xs"
        isLoading={loading}
        data-test-subj="statDisabled"
      />
    );

    const snoozedStatsComponent = (
      <Stat
        title={stats.muted + stats.snoozed}
        description={i18n.translate('xpack.triggersActionsUI.globalAlerts.alertStats.muted', {
          defaultMessage: 'Snoozed',
        })}
        color="primary"
        titleColor={stats.muted + stats.snoozed > 0 ? 'primary' : ''}
        titleSize="xs"
        isLoading={loading}
        data-test-subj="statMuted"
      />
    );

    const errorStatsComponent = (
      <Stat
        title={stats.error}
        description={i18n.translate('xpack.triggersActionsUI.globalAlerts.alertStats.errors', {
          defaultMessage: 'Errors',
        })}
        color="primary"
        titleColor={stats.error > 0 ? 'primary' : ''}
        titleSize="xs"
        isLoading={loading}
        data-test-subj="statErrors"
      />
    );

    return [
      <Stat
        title={stats.total}
        description={i18n.translate('xpack.triggersActionsUI.globalAlerts.alertStats.ruleCount', {
          defaultMessage: 'Rule count',
        })}
        color="primary"
        titleSize="xs"
        isLoading={loading}
        data-test-subj="statRuleCount"
      />,
      disabledStatsComponent,
      snoozedStatsComponent,
      errorStatsComponent,
      <Divider />,
      <EuiButtonEmpty data-test-subj="manageRulesPageButton" href={manageRulesHref}>
        {i18n.translate('xpack.triggersActionsUI.globalAlerts.manageRulesButtonLabel', {
          defaultMessage: 'Manage Rules',
        })}
      </EuiButtonEmpty>,
    ].reverse();
  }, [
    loading,
    manageRulesHref,
    stats.disabled,
    stats.error,
    stats.muted,
    stats.snoozed,
    stats.total,
  ]);
};
