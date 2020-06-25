/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useMount } from 'react-use';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { AnomalyRecord } from '../../use_log_entry_rate_results';
import { useLogEntryRateModuleContext } from '../../use_log_entry_rate_module';
import { useLogEntryRateExamples } from '../../use_log_entry_rate_examples';
import { LogEntryExampleMessages } from '../../../../../components/logging/log_entry_examples/log_entry_examples';
import { bucketSpan } from '../../../../../../common/log_analysis/job_parameters';
import { LogEntryRateExampleMessage } from './log_entry_example';

const EXAMPLE_COUNT = 5;

const examplesTitle = i18n.translate('xpack.infra.logs.analysis.anomaliesTableExamplesTitle', {
  defaultMessage: 'Example logs',
});

export const AnomaliesTableExpandedRow: React.FunctionComponent<{
  anomaly: AnomalyRecord;
  timeRange: TimeRange;
  jobId: string;
}> = ({ anomaly, timeRange, jobId }) => {
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
    endTime: anomaly.startTime + bucketSpan / 2,
    exampleCount: EXAMPLE_COUNT,
    sourceId,
    startTime: anomaly.startTime - bucketSpan / 2,
  });

  useMount(() => {
    getLogEntryRateExamples();
  });

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{examplesTitle}</h3>
          </EuiTitle>
          <LogEntryExampleMessages
            isLoading={isLoadingLogEntryRateExamples}
            hasFailedLoading={hasFailedLoadingLogEntryRateExamples}
            hasResults={logEntryRateExamples.length > 0}
            exampleCount={EXAMPLE_COUNT}
            onReload={getLogEntryRateExamples}
          >
            {logEntryRateExamples.map((example, exampleIndex) => (
              <LogEntryRateExampleMessage
                key={exampleIndex}
                id={example.id}
                dataset={example.dataset}
                message={example.message}
                timestamp={example.timestamp}
                tiebreaker={example.tiebreaker}
                timeRange={timeRange}
                jobId={jobId}
              />
            ))}
          </LogEntryExampleMessages>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={numeral(anomaly.typicalLogEntryRate).format('0.00a')}
                titleSize="m"
                description={i18n.translate(
                  'xpack.infra.logs.analysis.anomaliesExpandedRowTypicalRateDescription',
                  {
                    defaultMessage: 'Typical',
                  }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={numeral(anomaly.actualLogEntryRate).format('0.00a')}
                titleSize="m"
                description={i18n.translate(
                  'xpack.infra.logs.analysis.anomaliesExpandedRowActualRateDescription',
                  {
                    defaultMessage: 'Actual',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
