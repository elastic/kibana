/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingLogo } from '@elastic/eui';
import React, { useEffect } from 'react';
import { AnnotationsContextProvider } from '../../../context/annotations/annotations_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useEntityManagerEnablementContext } from '../../../context/entity_manager_context/use_entity_manager_enablement_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { isApmSignal, isLogsSignal, isLogsOnlySignal } from '../../../utils/get_signal_type';
import { ApmOverview } from './apm_overview';
import { LogsOverview } from './logs_overview';
import { ServiceTabEmptyState } from '../service_tab_empty_state';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */
export const chartHeight = 288;

export function ServiceOverview() {
  const { isEntityCentricExperienceViewEnabled } = useEntityManagerEnablementContext();
  const { serviceName, serviceEntitySummary, serviceEntitySummaryStatus } = useApmServiceContext();

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

  const [dismissedLogsOnlyEmptyState, setDismissedLogsOnlyEmptyState] = useLocalStorage(
    `apm.dismissedLogsOnlyEmptyState.overview`,
    false
  );

  const hasSignal =
    serviceEntitySummary?.dataStreamTypes && serviceEntitySummary?.dataStreamTypes?.length > 0;

  const hasLogsOnlySignal = hasSignal && isLogsOnlySignal(serviceEntitySummary.dataStreamTypes);

  const hasLogsSignal = hasSignal && isLogsSignal(serviceEntitySummary.dataStreamTypes);

  // Shows APM overview when entity has APM signal or when Entity centric is not enabled
  const hasApmSignal = hasSignal && isApmSignal(serviceEntitySummary.dataStreamTypes);

  // Shows APM overview when entity has APM signal or when Entity centric is not enabled or when entity has no signal
  const showApmOverview =
    isEntityCentricExperienceViewEnabled === false || hasApmSignal || !hasSignal;

  if (serviceEntitySummaryStatus === FETCH_STATUS.LOADING) {
    return (
      <div style={{ textAlign: 'center' }}>
        <EuiLoadingLogo logo="logoObservability" size="l" />
      </div>
    );
  }

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
            {showApmOverview ? <ApmOverview /> : null}
            {/* Only shows Logs overview when entity has Logs signal */}
            {hasLogsSignal ? (
              <>
                {hasLogsOnlySignal && !dismissedLogsOnlyEmptyState && (
                  <EuiFlexItem>
                    <ServiceTabEmptyState
                      id="serviceOverview"
                      onDissmiss={() => setDismissedLogsOnlyEmptyState(true)}
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <LogsOverview />
                </EuiFlexItem>
              </>
            ) : null}
          </EuiFlexGroup>
        </ChartPointerEventContextProvider>
      </AnnotationsContextProvider>
    </>
  );
}
