/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiSkeletonRectangle } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';

import { SloIndicatorTypeBadge } from './slo_indicator_type_badge';
import { SloStatusBadge } from '../../../../components/slo/slo_status_badge';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { SloTimeWindowBadge } from './slo_time_window_badge';
import { SloRulesBadge } from './slo_rules_badge';
import type { SloRule } from '../../../../hooks/slo/use_fetch_rules_for_slo';
import { SloGroupByBadge } from '../../../../components/slo/slo_status_badge/slo_group_by_badge';

export interface Props {
  activeAlerts?: number;
  isLoading: boolean;
  rules: Array<Rule<SloRule>> | undefined;
  slo: SLOWithSummaryResponse;
  onClickRuleBadge: () => void;
}

export function SloBadges({ activeAlerts, isLoading, rules, slo, onClickRuleBadge }: Props) {
  return (
    <EuiFlexGroup direction="row" responsive={false} gutterSize="s" alignItems="center" wrap>
      {isLoading ? (
        <>
          <EuiSkeletonRectangle
            isLoading
            contentAriaLabel="Loading"
            width="54.16px"
            height="20px"
            borderRadius="s"
          />
          <EuiSkeletonRectangle
            isLoading
            contentAriaLabel="Loading"
            width="54.16px"
            height="20px"
            borderRadius="s"
          />
          <EuiSkeletonRectangle
            isLoading
            contentAriaLabel="Loading"
            width="54.16px"
            height="20px"
            borderRadius="s"
          />
        </>
      ) : (
        <>
          <SloStatusBadge slo={slo} />
          <SloGroupByBadge slo={slo} />
          <SloIndicatorTypeBadge slo={slo} />
          <SloTimeWindowBadge slo={slo} />
          <SloActiveAlertsBadge slo={slo} activeAlerts={activeAlerts} />
          <SloRulesBadge rules={rules} onClick={onClickRuleBadge} />
        </>
      )}
    </EuiFlexGroup>
  );
}
