/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React, { useEffect } from 'react';
import { AnnotationsContextProvider } from '../../../context/annotations/annotations_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ApmOverview } from './apm_overview';
import { SearchBar } from '../../shared/search_bar/search_bar';
/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */
export const chartHeight = 288;

export function ServiceOverview() {
  const { serviceName } = useApmServiceContext();

  const setScreenContext = useApmPluginContext().observabilityAIAssistant?.service.setScreenContext;

  useEffect(() => {
    return setScreenContext?.({
      screenDescription: `The user is looking at the service overview page for ${serviceName}.`,
      data: [
        {
          name: 'service_name',
          description: 'The name of the service',
          value: serviceName,
        },
      ],
    });
  }, [setScreenContext, serviceName]);

  const {
    query: { environment, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  return (
    <>
      <SearchBar showTimeComparison showTransactionTypeSelector />
      <AnnotationsContextProvider
        serviceName={serviceName}
        environment={environment}
        start={start}
        end={end}
      >
        <ChartPointerEventContextProvider>
          <EuiFlexGroup direction="column" gutterSize="s">
            <ApmOverview />
          </EuiFlexGroup>
        </ChartPointerEventContextProvider>
      </AnnotationsContextProvider>
    </>
  );
}
