/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';

import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { SloStatusBadge } from '../../../components/slo/slo_status_badge';
import { SloActiveAlertsBadge } from '../../../components/slo/slo_status_badge/slo_active_alerts_badge';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
  isLoading: boolean;
}

export function HeaderTitle(props: Props) {
  const { isLoading, slo } = props;

  const { data: activeAlerts } = useFetchActiveAlerts({
    sloIds: !!slo ? [slo.id] : [],
  });

  if (isLoading) {
    return <EuiLoadingSpinner data-test-subj="loadingTitle" />;
  }

  if (!slo) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>{slo.name}</EuiFlexItem>
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
        <SloStatusBadge slo={slo} />
        <SloActiveAlertsBadge activeAlerts={activeAlerts[slo.id]} />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
