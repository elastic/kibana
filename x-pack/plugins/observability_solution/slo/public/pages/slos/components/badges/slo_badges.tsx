/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSkeletonRectangle } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import { SloRemoteBadge } from '../card_view/slo_remote_badge';
import { SloStatusBadge } from '../../../../components/slo/slo_status_badge';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { BurnRateRuleParams } from '../../../../typings';
import { SloTagsList } from '../common/slo_tags_list';
import { SloIndicatorTypeBadge } from './slo_indicator_type_badge';
import { SloRulesBadge } from './slo_rules_badge';
import { SloTimeWindowBadge } from './slo_time_window_badge';

export type ViewMode = 'default' | 'compact';

export interface SloBadgesProps {
  activeAlerts?: number;
  isLoading: boolean;
  rules: Array<Rule<BurnRateRuleParams>> | undefined;
  slo: SLOWithSummaryResponse;
  onClickRuleBadge: () => void;
}

export function SloBadges({
  activeAlerts,
  isLoading,
  rules,
  slo,
  onClickRuleBadge,
}: SloBadgesProps) {
  return (
    <EuiFlexGroup direction="row" responsive={false} gutterSize="s" alignItems="center" wrap>
      {isLoading ? (
        <LoadingBadges />
      ) : (
        <>
          <SloStatusBadge slo={slo} />
          <SloActiveAlertsBadge slo={slo} activeAlerts={activeAlerts} />
          <SloIndicatorTypeBadge slo={slo} />
          <SloTimeWindowBadge slo={slo} />
          <SloRemoteBadge slo={slo} />
          <SloRulesBadge rules={rules} onClick={onClickRuleBadge} isRemote={!!slo.remote} />
          <SloTagsList tags={slo.tags} numberOfTagsToDisplay={1} color="default" ignoreEmpty />
        </>
      )}
    </EuiFlexGroup>
  );
}

export function LoadingBadges() {
  return (
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
  );
}
