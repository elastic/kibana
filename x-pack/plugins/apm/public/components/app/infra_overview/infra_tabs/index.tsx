/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiLoadingSpinner } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EntityService, getService } from '@kbn/observability-plugin/public';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useTabs } from './use_tabs';
import { ApmPluginStartDeps } from '../../../../plugin';

export function InfraTabs() {
  const { serviceName } = useApmServiceContext();
  const kibana = useKibana<ApmPluginStartDeps>();
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/infrastructure');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const [service, updateService] = useState<EntityService | null>(null);

  useEffect(() => {
    async function get() {
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();

      const retrievedService = await getService({
        name: serviceName,
        environment,
        client: kibana.services.data,
        start: startTime,
        end: endTime,
      });
      updateService(retrievedService);
    }
    get();
  }, [serviceName, environment, start, end, kibana.services.data]);

  if (service === null) {
    return (
      <div style={{ textAlign: 'center' }}>
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  return <Tabs service={service} start={start} end={end} />;
}

interface TabsProps {
  service: EntityService;
  start: string;
  end: string;
}

const Tabs: React.FC<TabsProps> = ({ service, start, end }) => {
  const { containerIds, podNames, hostNames } = service.infrastructure;

  const tabs = useTabs({
    containerIds,
    podNames,
    hostNames,
    start,
    end,
  });

  return (
    <>
      <EuiTabbedContent
        tabs={tabs}
        initialSelectedTab={tabs[0]}
        autoFocus="selected"
      />
    </>
  );
};
