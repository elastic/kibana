/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import React, { useEffect, useState } from 'react';
import { WidgetRenderAPI } from '@kbn/investigate-plugin/public/types';
import { i18n } from '@kbn/i18n';
import type { Environment } from '../../../common/environment_rt';
import { ServiceIcons } from '../../components/shared/service_icons';
import { TransactionTypeSelectBase } from '../../components/shared/transaction_type_select';
import { InvestigateLatencyChart } from './investigate_latency_chart';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { ChartPointerEventContextProvider } from '../../context/chart_pointer_event/chart_pointer_event_context';
import {
  PreferredDataSourceAndBucketSize,
  usePreferredDataSourceAndBucketSize,
} from '../../hooks/use_preferred_data_source_and_bucket_size';
import { ApmDocumentType } from '../../../common/document_type';
import { InvestigateTransactionThroughputChart } from './investigate_transaction_throughput_chart';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import { AnnotationsContextProvider } from '../../context/annotations/annotations_context';
import { useServiceTransactionTypesFetcher } from '../../context/apm_service/use_service_transaction_types_fetcher';
import { InvestigateTransactionFailureRateChart } from './investigate_transaction_failure_rate_chart';

function InvestigateServiceDetailHeader({
  serviceName,
  start,
  end,
  environment,
  transactionTypes,
  selectedTransactionType,
  onTransactionTypeChange,
}: {
  serviceName: string;
  start: string;
  end: string;
  environment: Environment;
  transactionTypes: string[];
  selectedTransactionType: string | undefined;
  onTransactionTypeChange: (type: string) => void;
}) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiTitle size="m">
          <h1>{serviceName}</h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ServiceIcons
          serviceName={serviceName}
          environment={environment}
          start={start}
          end={end}
          iconSize="m"
        />
      </EuiFlexItem>
      <EuiFlexItem grow />
      <EuiFlexItem grow={false}>
        <TransactionTypeSelectBase
          transactionTypes={transactionTypes}
          selectedTransactionType={selectedTransactionType}
          onChange={(event) => onTransactionTypeChange(event.currentTarget.value)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function InvestigateServiceDetailBase({
  serviceName,
  start,
  end,
  kuery,
  environment,
  transactionTypes,
  transactionTypeStatus,
  selectedTransactionType,
  onTransactionTypeChange,
  latencyAggregationType,
  preferred,
}: {
  serviceName: string;
  start: string;
  end: string;
  kuery: string;
  environment: Environment;
  transactionTypes: string[];
  selectedTransactionType: string | undefined;
  transactionTypeStatus: FETCH_STATUS;
  onTransactionTypeChange: (type: string) => void;
  latencyAggregationType: LatencyAggregationType;
  preferred: PreferredDataSourceAndBucketSize<
    ApmDocumentType.ServiceTransactionMetric | ApmDocumentType.TransactionMetric
  >;
}) {
  return (
    <ChartPointerEventContextProvider>
      <AnnotationsContextProvider
        serviceName={serviceName}
        environment={environment}
        start={start}
        end={end}
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <InvestigateServiceDetailHeader
              serviceName={serviceName}
              start={start}
              end={end}
              environment={environment}
              transactionTypes={transactionTypes}
              selectedTransactionType={selectedTransactionType}
              onTransactionTypeChange={onTransactionTypeChange}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <InvestigateLatencyChart
                  comparisonEnabled={false}
                  serviceName={serviceName}
                  start={start}
                  end={end}
                  kuery={kuery}
                  environment={environment}
                  latencyAggregationType={latencyAggregationType}
                  offset={undefined}
                  transactionName={undefined}
                  transactionType={selectedTransactionType}
                  preferred={preferred}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="row" gutterSize="s">
                  <EuiFlexItem>
                    <InvestigateTransactionThroughputChart
                      start={start}
                      end={end}
                      kuery={kuery}
                      environment={environment}
                      serviceName={serviceName}
                      transactionName={undefined}
                      transactionType={selectedTransactionType}
                      transactionTypeStatus={transactionTypeStatus}
                      preferred={preferred}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <InvestigateTransactionFailureRateChart
                      start={start}
                      end={end}
                      kuery={kuery}
                      environment={environment}
                      serviceName={serviceName}
                      transactionName={undefined}
                      transactionType={selectedTransactionType}
                      transactionTypeStatus={transactionTypeStatus}
                      preferred={preferred}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </AnnotationsContextProvider>
    </ChartPointerEventContextProvider>
  );
}

export function InvestigateServiceDetail({
  serviceName,
  environment,
  timeRange,
  query,
  transactionType: initialTransactionType,
  blocks,
}: {
  environment: Environment;
  serviceName: string;
  transactionType: string | undefined;
} & GlobalWidgetParameters &
  Pick<WidgetRenderAPI, 'blocks'>) {
  const start = timeRange.from;
  const end = timeRange.to;
  const kuery = query.query;

  const documentType = ApmDocumentType.ServiceTransactionMetric;

  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery: '',
    numBuckets: 100,
    type: documentType,
  });

  let documentTypeForTransactionTypes = preferred?.source.documentType;

  if (documentTypeForTransactionTypes === ApmDocumentType.ServiceTransactionMetric) {
    documentTypeForTransactionTypes = ApmDocumentType.TransactionMetric;
  }

  const { status: transactionTypeStatus, transactionTypes } = useServiceTransactionTypesFetcher({
    serviceName,
    start,
    end,
    documentType: documentTypeForTransactionTypes,
    rollupInterval: preferred?.source.rollupInterval,
  });

  const [selectedTransactionType, setSelectedTransactionType] = useState(initialTransactionType);

  useEffect(() => {
    setSelectedTransactionType((prevSelectedTransactionType) => {
      if (!transactionTypes) {
        return prevSelectedTransactionType;
      }
      if (prevSelectedTransactionType && transactionTypes.includes(prevSelectedTransactionType)) {
        return prevSelectedTransactionType;
      }
      return transactionTypes[0];
    });
  }, [transactionTypes]);

  useEffect(() => {
    blocks.publish([
      {
        id: 'logs',
        loading: false,
        color: 'lightShade',
        content: i18n.translate('xpack.apm.investigateServiceDetail.viewLogsBlock', {
          defaultMessage: 'View logs',
        }),
      },
    ]);
  }, [blocks]);

  return (
    <InvestigateServiceDetailBase
      start={start}
      end={end}
      serviceName={serviceName}
      environment={environment}
      preferred={preferred}
      kuery={kuery}
      latencyAggregationType={LatencyAggregationType.avg}
      transactionTypes={transactionTypes}
      transactionTypeStatus={transactionTypeStatus}
      onTransactionTypeChange={(type) => {
        setSelectedTransactionType(type);
      }}
      selectedTransactionType={selectedTransactionType}
    />
  );
}
