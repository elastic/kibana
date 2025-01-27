/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel } from '@elastic/eui';
import React from 'react';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { isLogsOnlySignal } from '../../../utils/get_signal_type';
import { InfraTabs } from './infra_tabs';
import { ServiceTabEmptyState } from '../service_tab_empty_state';

export function InfraOverview() {
  const { serviceEntitySummary } = useApmServiceContext();

  const hasLogsOnlySignal =
    serviceEntitySummary?.dataStreamTypes && isLogsOnlySignal(serviceEntitySummary.dataStreamTypes);

  if (hasLogsOnlySignal) {
    return <ServiceTabEmptyState id="infraOverview" />;
  }

  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <InfraTabs />
    </EuiPanel>
  );
}
