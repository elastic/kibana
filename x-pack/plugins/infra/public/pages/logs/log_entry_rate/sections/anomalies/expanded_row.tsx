/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useMount } from 'react-use';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { AnomalyRecord } from '../../use_log_entry_rate_results';
import { useLogEntryRateModuleContext } from '../../use_log_entry_rate_module';
import { useLogEntryRateExamples } from '../../use_log_entry_rate_examples';
import { LogEntryExampleMessages } from '../../../../../components/logging/log_entry_examples/log_entry_examples';
import { LogEntryRateExampleMessage, LogEntryRateExampleMessageHeaders } from './log_entry_example';
import { euiStyled } from '../../../../../../../observability/public';

const EXAMPLE_COUNT = 5;

const examplesTitle = i18n.translate('xpack.infra.logs.analysis.anomaliesTableExamplesTitle', {
  defaultMessage: 'Example log entries',
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
    endTime: anomaly.startTime + anomaly.duration,
    exampleCount: EXAMPLE_COUNT,
    sourceId,
    startTime: anomaly.startTime,
  });

  useMount(() => {
    getLogEntryRateExamples();
  });

  return (
    <>
      <ExpandedContentWrapper direction="column">
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
            {logEntryRateExamples.length > 0 ? (
              <>
                <LogEntryRateExampleMessageHeaders dateTime={logEntryRateExamples[0].timestamp} />
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
              </>
            ) : null}
          </LogEntryExampleMessages>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiStat
                titleSize="s"
                title={`${numeral(anomaly.typicalLogEntryRate).format('0.00a')} ${i18n.translate(
                  'xpack.infra.logs.analysis.anomaliesExpandedRowTypicalRateTitle',
                  {
                    defaultMessage: '{typicalCount, plural, one {message} other {messages}}',
                    values: { typicalCount: anomaly.typicalLogEntryRate },
                  }
                )}`}
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
                titleSize="s"
                title={`${numeral(anomaly.actualLogEntryRate).format('0.00a')} ${i18n.translate(
                  'xpack.infra.logs.analysis.anomaliesExpandedRowActualRateTitle',
                  {
                    defaultMessage: '{actualCount, plural, one {message} other {messages}}',
                    values: { actualCount: anomaly.actualLogEntryRate },
                  }
                )}`}
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
      </ExpandedContentWrapper>
    </>
  );
};

const ExpandedContentWrapper = euiStyled(EuiFlexGroup)`
  overflow: hidden;
`;
