/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutProps,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import { Environment } from '../../../../common/environment_rt';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { AgentIcon } from '../agent_icon';
import { ServiceSummaryTransactionCharts } from './service_summary_transaction_charts';
import { useServiceSummaryAnomalyFetcher } from './use_service_summary_anomaly_fetcher';
import { useServiceTransactionSummaryFetcher } from './use_service_transaction_summary_fetcher';
import { useServiceSummaryServiceDestinationFetcher } from './use_service_summary_service_destination_fetcher';
import { ServiceSummaryServiceDestinationCharts } from './service_summary_service_destination_charts';
import { ApmDocumentType } from '../../../../common/document_type';
import { usePreferredDataSourceAndBucketSize } from '../../../hooks/use_preferred_data_source_and_bucket_size';
import { ApmMlModule } from '../../../../common/anomaly_detection/apm_ml_module';
import { ApmRoutes } from '../../routing/apm_route_config';
import { ServiceMap } from '../../app/service_map';

export type ServiceSummaryFlyoutRoutePath = '/services';
export type ServiceSummaryFlyoutParams = TypeOf<
  ApmRoutes,
  ServiceSummaryFlyoutRoutePath
>;

type Props = {
  serviceName: string;
  transactionType: string;
  rangeFrom: string;
  rangeTo: string;
  environment: Environment;
  isOpen: boolean;
  params: ServiceSummaryFlyoutParams;
  routePath: ServiceSummaryFlyoutRoutePath;
} & Pick<EuiFlyoutProps, 'onClose'>;

export function ServiceSummaryFlyout({
  serviceName,
  transactionType,
  rangeFrom,
  rangeTo,
  environment,
  isOpen,
  params,
  routePath,
  onClose,
}: Props) {
  const numBuckets = 100;

  const preferredTxSource = usePreferredDataSourceAndBucketSize({
    rangeFrom,
    rangeTo,
    kuery: '',
    numBuckets,
    type: ApmDocumentType.ServiceTransactionMetric,
  });

  const preferredExitSpanSource = usePreferredDataSourceAndBucketSize({
    rangeFrom,
    rangeTo,
    kuery: '',
    numBuckets,
    type: ApmDocumentType.ServiceDestinationMetric,
  });

  const transactionSummaryFetch = useServiceTransactionSummaryFetcher({
    serviceName,
    transactionType,
    rangeFrom,
    rangeTo,
    environment,
    preferredTxSource,
  });

  const serviceDestinationSummaryFetch =
    useServiceSummaryServiceDestinationFetcher({
      serviceName,
      rangeFrom,
      rangeTo,
      environment,
      preferredExitSpanSource,
    });

  const txAnomalySummaryFetch = useServiceSummaryAnomalyFetcher({
    serviceName,
    by: transactionType,
    module: ApmMlModule.Transaction,
    rangeFrom,
    rangeTo,
    environment,
    bucketSizeInSeconds: preferredTxSource?.bucketSizeInSeconds,
  });

  const serviceDestinationAnomalySummaryFetch = useServiceSummaryAnomalyFetcher(
    {
      serviceName,
      by: null,
      module: ApmMlModule.ServiceDestination,
      rangeFrom,
      rangeTo,
      environment,
      bucketSizeInSeconds: preferredExitSpanSource?.bucketSizeInSeconds,
    }
  );

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const agentNameFetch = useFetcher(
    (callApmApi) => {
      if (!serviceName) {
        return undefined;
      }

      return callApmApi('GET /internal/apm/services/{serviceName}/agent', {
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
          },
        },
      });
    },
    [serviceName, start, end]
  );

  if (!isOpen) {
    return null;
  }

  const isLoading =
    isPending(transactionSummaryFetch.status) ||
    isPending(txAnomalySummaryFetch.status) ||
    isPending(serviceDestinationAnomalySummaryFetch.status) ||
    isPending(serviceDestinationSummaryFetch.status) ||
    isPending(agentNameFetch.status);

  return (
    <ChartPointerEventContextProvider disabled>
      <EuiFlyout onClose={onClose}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem grow={false}>
              {agentNameFetch.data ? (
                <AgentIcon
                  agentName={agentNameFetch.data.agentName as AgentName}
                />
              ) : (
                <EuiLoadingSpinner size="l" />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2>{serviceName}</h2>
              </EuiTitle>
            </EuiFlexItem>
            {isLoading && agentNameFetch.data ? (
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            ) : undefined}
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup direction="row">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate(
                    'xpack.apm.serviceSummaryFlyout.latencyColumnTitle',
                    { defaultMessage: 'Latency' }
                  )}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate(
                    'xpack.apm.serviceSummaryFlyout.throughputColumnTitle',
                    { defaultMessage: 'Throughput' }
                  )}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate(
                    'xpack.apm.serviceSummaryFlyout.failureRateColumnTitle',
                    { defaultMessage: 'Failure rate' }
                  )}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <ServiceSummaryTransactionCharts
            transactionSummaryFetch={transactionSummaryFetch}
            anomalySummaryFetch={txAnomalySummaryFetch}
          />
          <EuiSpacer size="l" />
          <ServiceMap
            serviceName={serviceName}
            environment={environment}
            kuery=""
            start={start}
            end={end}
            compact
          />
          <EuiSpacer size="l" />
          <ServiceSummaryServiceDestinationCharts
            serviceDestinationSummaryFetch={serviceDestinationSummaryFetch}
            anomalySummaryFetch={serviceDestinationAnomalySummaryFetch}
            params={params}
            serviceName={serviceName}
            routePath={routePath}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    </ChartPointerEventContextProvider>
  );
}
