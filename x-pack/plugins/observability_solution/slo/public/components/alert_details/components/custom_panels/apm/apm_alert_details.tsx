/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import {
  APMEmbeddableRoot,
  APMTransactionDurationSLOResponse,
  APMErrorRateSLOResponse,
} from './embeddable_root';
import type { BurnRateRule, BurnRateAlert, TimeRange } from '../../../types';

interface APMAlertDetailsProps<IndicatorType> {
  slo: IndicatorType;
  alert: BurnRateAlert;
  rule: BurnRateRule;
  dataTimeRange: TimeRange;
}

export function APMLatencyAlertDetails({
  slo,
  dataTimeRange,
  alert,
  rule,
}: APMAlertDetailsProps<APMTransactionDurationSLOResponse>) {
  return (
    <EuiFlexGroup direction="column" data-test-subj="overviewSection">
      <APMEmbeddableRoot
        slo={slo}
        dataTimeRange={dataTimeRange}
        embeddableId={'APM_ALERTING_LATENCY_CHART_EMBEDDABLE'}
        alert={alert}
        rule={rule}
      />
      <EuiFlexGroup>
        <EuiFlexItem>
          <APMEmbeddableRoot
            slo={slo}
            dataTimeRange={dataTimeRange}
            embeddableId={'APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE'}
            alert={alert}
            rule={rule}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <APMEmbeddableRoot
            slo={slo}
            dataTimeRange={dataTimeRange}
            embeddableId={'APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE'}
            alert={alert}
            rule={rule}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

export function APMAvailabilityAlertDetails({
  slo,
  dataTimeRange,
  alert,
  rule,
}: APMAlertDetailsProps<APMErrorRateSLOResponse>) {
  return (
    <EuiFlexGroup direction="column" data-test-subj="overviewSection">
      <APMEmbeddableRoot
        slo={slo}
        dataTimeRange={dataTimeRange}
        embeddableId={'APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE'}
        alert={alert}
        rule={rule}
      />
      <EuiFlexGroup>
        <EuiFlexItem>
          <APMEmbeddableRoot
            slo={slo}
            dataTimeRange={dataTimeRange}
            embeddableId={'APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE'}
            alert={alert}
            rule={rule}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <APMEmbeddableRoot
            slo={slo}
            dataTimeRange={dataTimeRange}
            embeddableId={'APM_ALERTING_LATENCY_CHART_EMBEDDABLE'}
            alert={alert}
            rule={rule}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
