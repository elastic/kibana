/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { AnalyzeInMlButton } from '../../../../../components/logging/log_analysis_results';
import { LogEntryRateResults } from '../../use_log_entry_rate_results';
import {
  getAnnotationsForPartition,
  getLogEntryRateSeriesForPartition,
  getTotalNumberOfLogEntriesForPartition,
} from '../helpers/data_formatters';

export const AnomaliesTableExpandedRow: React.FunctionComponent<{
  id: string;
  results: LogEntryRateResults;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  jobId: string;
}> = ({ id, results, timeRange, setTimeRange, jobId }) => {
  const anomaly = useMemo(() => {
    return results.anomalies.find((_anomaly) => _anomaly.uuid === id);
  }, [results, id]);

  if (!anomaly) return null;

  return (
    <>
      <div>Example logs</div>
      <div>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiStat
              title={numeral(anomaly.typicalLogEntryRate).format('0.00a')}
              titleSize="m"
              description={i18n.translate(
                'xpack.infra.logs.analysis.anomaliesExpandedRowTypicalRateDescription',
                {
                  defaultMessage: 'Typical',
                }
              )}
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={numeral(anomaly.actualLogEntryRate).format('0.00a')}
              titleSize="m"
              description={i18n.translate(
                'xpack.infra.logs.analysis.anomaliesExpandedRowActualRateDescription',
                {
                  defaultMessage: 'Actual',
                }
              )}
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );
};
