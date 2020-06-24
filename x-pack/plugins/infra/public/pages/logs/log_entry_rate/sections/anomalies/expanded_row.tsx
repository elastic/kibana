/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useMount } from 'react-use';

import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { AnalyzeInMlButton } from '../../../../../components/logging/log_analysis_results';
import { LogEntryRateResults } from '../../use_log_entry_rate_results';
import {
  getAnnotationsForPartition,
  getLogEntryRateSeriesForPartition,
  getTotalNumberOfLogEntriesForPartition,
} from '../helpers/data_formatters';
import { useLogEntryRateModuleContext } from '../../use_log_entry_rate_module';
import { useLogEntryRateExamples } from '../../use_log_entry_rate_examples';

export const AnomaliesTableExpandedRow: React.FunctionComponent<{
  id: string;
  results: LogEntryRateResults;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  jobId: string;
}> = ({ id, results, timeRange, setTimeRange, jobId }) => {
  const anomaly = useMemo(() => {
    return results.anomalies.find((_anomaly) => _anomaly.id === id);
  }, [results, id]);

  // if (!anomaly) return null;

  const {
    sourceConfiguration: { sourceId },
  } = useLogEntryRateModuleContext();

  const {
    getLogEntryRateExamples,
    hasFailedLoadingLogEntryRateExamples,
    isLoadingLogEntryRateExamples,
    logEntryRateExamples,
  } = useLogEntryRateExamples({
    dataset: anomaly.partitionId,
    endTime: timeRange.endTime,
    exampleCount: 4,
    sourceId,
    startTime: timeRange.startTime,
  });

  useMount(() => {
    getLogEntryRateExamples();
  });

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
