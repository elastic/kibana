/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { BurnRateRuleParams } from '../../../../typings';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { LoadingBadges } from '../badges/slo_badges';
import { SloRemoteBadge } from '../badges/slo_remote_badge';
import { SloRulesBadge } from '../badges/slo_rules_badge';
import { SloTimeWindowBadge } from '../badges/slo_time_window_badge';
import { SloTagsList } from '../common/slo_tags_list';
import { SLOCardItemInstanceBadge } from './slo_card_item_instance_badge';

interface Props {
  hasGroupBy: boolean;
  activeAlerts?: number;
  slo: SLOWithSummaryResponse;
  rules: Array<Rule<BurnRateRuleParams>> | undefined;
  handleCreateRule?: () => void;
}

const Container = styled.div`
  display: inline-block;
  margin-top: 5px;
`;

export function SloCardItemBadges({ slo, activeAlerts, rules, handleCreateRule }: Props) {
  const { onStateChange } = useUrlSearchState();

  const onTagClick = useCallback(
    (tag: string) => {
      onStateChange({
        kqlQuery: `slo.tags: "${tag}"`,
      });
    },
    [onStateChange]
  );

  return (
    <Container
      onClick={(evt) => {
        evt.stopPropagation();
      }}
    >
      <EuiFlexGroup direction="row" responsive={false} gutterSize="xs" alignItems="center" wrap>
        {!slo.summary ? (
          <LoadingBadges />
        ) : (
          <>
            <SloActiveAlertsBadge slo={slo} activeAlerts={activeAlerts} viewMode="compact" />
            <SLOCardItemInstanceBadge slo={slo} />
            <SloRulesBadge rules={rules} onClick={handleCreateRule} isRemote={!!slo.remote} />
            <SloTimeWindowBadge slo={slo} color="default" />
            <SloRemoteBadge slo={slo} />
            <SloTagsList
              tags={slo.tags}
              numberOfTagsToDisplay={1}
              color="default"
              ignoreEmpty
              onClick={onTagClick}
            />
          </>
        )}
      </EuiFlexGroup>
    </Container>
  );
}
