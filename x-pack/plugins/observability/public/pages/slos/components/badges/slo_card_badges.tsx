/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import { LoadingBadges, SloBadgesProps } from './slo_badges';
import { SloIndicatorTypeBadge } from './slo_indicator_type_badge';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { SloTimeWindowBadge } from './slo_time_window_badge';
import { SloRulesBadge } from './slo_rules_badge';
import { SloGroupByBadge } from '../../../../components/slo/slo_status_badge/slo_group_by_badge';

export function SloCardBadges({
  activeAlerts,
  isLoading,
  rules,
  slo,
  onClickRuleBadge,
}: SloBadgesProps) {
  return (
    <>
      <EuiFlexGroup direction="row" responsive={false} gutterSize="s" alignItems="center" wrap>
        {isLoading ? (
          <LoadingBadges />
        ) : (
          <>
            <SloIndicatorTypeBadge slo={slo} color="default" />
            <SloTimeWindowBadge slo={slo} color="default" />
            <SloActiveAlertsBadge slo={slo} activeAlerts={activeAlerts} viewMode="compact" />
            <SloRulesBadge rules={rules} onClick={onClickRuleBadge} />
          </>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" responsive={false} gutterSize="s" alignItems="center" wrap>
        <SloGroupByBadge slo={slo} color="default" />
      </EuiFlexGroup>
    </>
  );
}
