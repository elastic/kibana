/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingChart,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { CheckboxShowCharts } from '../components/controls/checkbox_showcharts';
// @ts-ignore
import { ExplorerChartsContainer } from './explorer_charts/explorer_charts_container';
import {
  SelectSeverityUI,
  TableSeverity,
} from '../components/controls/select_severity/select_severity';
import {
  SelectIntervalUI,
  TableInterval,
} from '../components/controls/select_interval/select_interval';
import type { AnomalyChartData } from '../services/anomaly_explorer_service';
import type { AppStateSelectedCells } from './explorer_utils';
import type { UrlGeneratorContract } from '../../../../../../src/plugins/share/public/url_generators';
import type { TimeBuckets } from '../util/time_buckets';
import type { TimefilterContract } from '../../../../../../src/plugins/data/public/query/timefilter';
interface ExplorerAnomaliesContainerProps {
  chartsData: AnomalyChartData;
  selectedCells: AppStateSelectedCells | undefined;
  showCharts: boolean;
  severity: TableSeverity;
  setSeverity: (severity: TableSeverity) => void;
  mlUrlGenerator: UrlGeneratorContract<'ML_APP_URL_GENERATOR'>;
  timeBuckets: TimeBuckets;
  timefilter: TimefilterContract;
  interval: TableInterval;
  setInterval: (interval: TableInterval) => void;
  isLoading: boolean;
}
export const ExplorerAnomaliesContainer: FC<ExplorerAnomaliesContainerProps> = ({
  chartsData,
  selectedCells,
  showCharts,
  severity,
  setSeverity,
  mlUrlGenerator,
  timeBuckets,
  timefilter,
  interval,
  setInterval,
}) => {
  return (
    <>
      <EuiFlexGroup
        direction="row"
        gutterSize="l"
        responsive={true}
        className="ml-anomalies-controls"
      >
        <EuiFlexItem grow={false} style={{ width: '170px' }}>
          <EuiFormRow
            label={i18n.translate('xpack.ml.explorer.severityThresholdLabel', {
              defaultMessage: 'Severity threshold',
            })}
          >
            <SelectSeverityUI severity={severity} setSeverity={setSeverity} />
          </EuiFormRow>
        </EuiFlexItem>
        {chartsData.seriesToPlot.length > 0 && selectedCells !== undefined && (
          <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
            <EuiFormRow label="&#8203;">
              <CheckboxShowCharts />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <div className="euiText explorer-charts">
        {showCharts && (
          <ExplorerChartsContainer
            {...{ ...chartsData, severity: severity.val, mlUrlGenerator, timeBuckets, timefilter }}
          />
        )}
      </div>
    </>
  );
};
