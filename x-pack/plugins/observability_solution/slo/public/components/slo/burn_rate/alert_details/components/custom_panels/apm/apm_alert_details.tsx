/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { APMTransactionDurationIndicator, GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import type { BurnRateAlert, BurnRateRule, TimeRange } from '../../../types';
import { APMEmbeddableRoot } from './embeddable_root';

interface APMAlertDetailsProps {
  slo: APMTransactionDurationSLOResponse;
  alert: BurnRateAlert;
  rule: BurnRateRule;
  dataTimeRange: TimeRange;
}

export type APMTransactionDurationSLOResponse = GetSLOResponse & {
  indicator: APMTransactionDurationIndicator;
};

export function APMAlertDetails({ slo, dataTimeRange, alert, rule }: APMAlertDetailsProps) {
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
