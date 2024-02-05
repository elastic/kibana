/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { useFetchRulesForSlo } from '../../../hooks/slo/use_fetch_rules_for_slo';
import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { SloListCardView } from './card_view/slos_card_view';
import { SloListEmpty } from './slo_list_empty';
import { SloListError } from './slo_list_error';
import { SloListItems } from './slo_list_items';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
  sloView: string;
}

export function SlosView({ sloList, loading, error, sloView }: Props) {
  const sloIdsAndInstanceIds = sloList.map(
    (slo) => [slo.id, slo.instanceId ?? ALL_VALUE] as [string, string]
  );

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({ sloIdsAndInstanceIds });
  const { data: rulesBySlo } = useFetchRulesForSlo({
    sloIds: sloIdsAndInstanceIds.map((item) => item[0]),
  });

  if (!loading && !error && sloList.length === 0) {
    return <SloListEmpty />;
  }
  if (!loading && error) {
    return <SloListError />;
  }

  return sloView === 'cardView' ? (
    <EuiFlexItem>
      <SloListCardView
        sloList={sloList}
        loading={loading}
        error={error}
        activeAlertsBySlo={activeAlertsBySlo}
        rulesBySlo={rulesBySlo}
      />
    </EuiFlexItem>
  ) : (
    <EuiFlexItem>
      <SloListItems
        sloList={sloList}
        activeAlertsBySlo={activeAlertsBySlo}
        rulesBySlo={rulesBySlo}
        error={error}
        loading={loading}
        isCompact={sloView === 'compactView'}
      />
    </EuiFlexItem>
  );
}
