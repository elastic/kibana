/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexGroupProps,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { AnnotationsContextProvider } from '../../../../context/annotations/annotations_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { LogErrorRateChart } from '../charts/log_error_rate_chart';
import { LogRateChart } from '../charts/log_rate_chart';
import { AddAPMCallOut } from './add_apm_callout';
import { useLocalStorage } from '../../../../hooks/use_local_storage';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */

const chartHeight = 400;

export function LogsServiceOverview() {
  const { serviceName } = useApmServiceContext();
  const [isLogsApmCalloutEnabled, setIsLogsApmCalloutEnabled] = useLocalStorage(
    'apm.isLogsApmCalloutEnabled',
    true
  );

  const {
    query: { environment, rangeFrom, rangeTo },
  } = useApmParams('/logs-services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callAPI) => {
      return callAPI('GET /internal/apm/entities/services/{serviceName}/summary', {
        params: { path: { serviceName }, query: { end, environment, start } },
      });
    },
    [end, environment, serviceName, start]
  );

  const { isLarge } = useBreakpoints();
  const isSingleColumn = isLarge;

  const rowDirection: EuiFlexGroupProps['direction'] = isSingleColumn ? 'column' : 'row';

  if (isPending(status)) {
    return (
      <div style={{ textAlign: 'center' }}>
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <AnnotationsContextProvider
      serviceName={serviceName}
      environment={environment}
      start={start}
      end={end}
    >
      <ChartPointerEventContextProvider>
        {isLogsApmCalloutEnabled ? (
          <>
            <AddAPMCallOut
              onClose={() => {
                setIsLogsApmCalloutEnabled(false);
              }}
            />
            <EuiSpacer size="l" />
          </>
        ) : null}
        {data?.entity?.hasLogMetrics === false ? (
          <>
            <EuiCallOut
              title={i18n.translate(
                'xpack.apm.logsServiceOverview.euiCallOut.noLogMetricsHaveLabel',
                {
                  defaultMessage: 'No log metrics have been detected against this service',
                }
              )}
              color="warning"
              iconType="warning"
            >
              <FormattedMessage
                id="xpack.apm.logsServiceOverview.pleaseEnsureYouAreCallOutLabel"
                defaultMessage="Please ensure you are surfacing {logLevelLink} in your logs to display log metrics. {learnMoreLink}"
                values={{
                  logLevelLink: (
                    <EuiLink
                      data-test-subj="apmNotAvailableLogsMetricsLink"
                      href="https://www.elastic.co/guide/en/ecs/current/ecs-log.html#field-log-level"
                      target="_blank"
                    >
                      {i18n.translate('xpack.apm.logsServiceOverview.logLevelLink', {
                        defaultMessage: 'log.level',
                      })}
                    </EuiLink>
                  ),
                  learnMoreLink: (
                    <EuiLink
                      data-test-subj="apmNotAvailableLogsMetricsLink"
                      href="https://ela.st/service-logs-level"
                      target="_blank"
                    >
                      {i18n.translate('xpack.apm.logsServiceOverview.learnMoreLink', {
                        defaultMessage: 'Learn more',
                      })}
                    </EuiLink>
                  ),
                }}
              />
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        ) : null}

        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction={rowDirection} gutterSize="s" responsive={false}>
              <EuiFlexItem grow={4}>
                <LogRateChart height={chartHeight} />
              </EuiFlexItem>
              <EuiFlexItem grow={4}>
                <LogErrorRateChart height={chartHeight} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ChartPointerEventContextProvider>
    </AnnotationsContextProvider>
  );
}
