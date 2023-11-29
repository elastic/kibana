/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import styled from 'styled-components';
import { EuiFlexGroup } from '@elastic/eui';
import { LoadingBadges } from '../badges/slo_badges';
import { SloIndicatorTypeBadge } from '../badges/slo_indicator_type_badge';
import { SloTimeWindowBadge } from '../badges/slo_time_window_badge';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { SloRulesBadge } from '../badges/slo_rules_badge';
import { SloRule } from '../../../../hooks/slo/use_fetch_rules_for_slo';

interface Props {
  isEmbeddable?: boolean;
  hasGroupBy: boolean;
  activeAlerts?: number;
  slo: SLOWithSummaryResponse;
  rules: Array<Rule<SloRule>> | undefined;
  handleCreateRule: () => void;
}

const Container = styled.div<{ topPosition: string }>`
  position: absolute;
  display: inline-block;
  top: ${({ topPosition }) => topPosition};
  left: 7px;
  z-index: 1;
`;

export function SloCardItemBadges({
  slo,
  activeAlerts,
  rules,
  handleCreateRule,
  hasGroupBy,
  isEmbeddable,
}: Props) {
  const topPosition =
    hasGroupBy && isEmbeddable ? '75px' : hasGroupBy || isEmbeddable ? '55px' : '35px';
  return (
    <Container topPosition={topPosition}>
      <EuiFlexGroup direction="row" responsive={false} gutterSize="s" alignItems="center" wrap>
        {!slo.summary ? (
          <LoadingBadges />
        ) : (
          <>
            <SloActiveAlertsBadge slo={slo} activeAlerts={activeAlerts} viewMode="compact" />
            <SloIndicatorTypeBadge slo={slo} color="default" />
            <SloTimeWindowBadge slo={slo} color="default" />
            <SloRulesBadge rules={rules} onClick={handleCreateRule} />
          </>
        )}
      </EuiFlexGroup>
    </Container>
  );
}
