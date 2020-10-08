/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiTitle } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useMount } from 'react-use';
import { euiStyled } from '../../../../../../../observability/public';
import { LogEntryAnomaly } from '../../../../../../common/http_api';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { LogEntryExampleMessages } from '../../../../../components/logging/log_entry_examples/log_entry_examples';
import { useLogSourceContext } from '../../../../../containers/logs/log_source';
import { useLogEntryExamples } from '../../use_log_entry_examples';
import { LogEntryExampleMessage, LogEntryExampleMessageHeaders } from './log_entry_example';

const EXAMPLE_COUNT = 5;

const examplesTitle = i18n.translate('xpack.infra.logs.analysis.anomaliesTableExamplesTitle', {
  defaultMessage: 'Example log entries',
});

export const AnomaliesTableExpandedRow: React.FunctionComponent<{
  anomaly: LogEntryAnomaly;
  timeRange: TimeRange;
}> = ({ anomaly, timeRange }) => {
  const { sourceId } = useLogSourceContext();

  const {
    getLogEntryExamples,
    hasFailedLoadingLogEntryExamples,
    isLoadingLogEntryExamples,
    logEntryExamples,
  } = useLogEntryExamples({
    dataset: anomaly.dataset,
    endTime: anomaly.startTime + anomaly.duration,
    exampleCount: EXAMPLE_COUNT,
    sourceId,
    startTime: anomaly.startTime,
    categoryId: anomaly.categoryId,
  });

  useMount(() => {
    getLogEntryExamples();
  });

  return (
    <>
      <ExpandedContentWrapper direction="column">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{examplesTitle}</h3>
          </EuiTitle>
          <LogEntryExampleMessages
            isLoading={isLoadingLogEntryExamples}
            hasFailedLoading={hasFailedLoadingLogEntryExamples}
            hasResults={logEntryExamples.length > 0}
            exampleCount={EXAMPLE_COUNT}
            onReload={getLogEntryExamples}
          >
            {logEntryExamples.length > 0 ? (
              <>
                <LogEntryExampleMessageHeaders dateTime={logEntryExamples[0].timestamp} />
                {logEntryExamples.map((example, exampleIndex) => (
                  <LogEntryExampleMessage
                    key={exampleIndex}
                    id={example.id}
                    dataset={example.dataset}
                    message={example.message}
                    timestamp={example.timestamp}
                    tiebreaker={example.tiebreaker}
                    timeRange={timeRange}
                    anomaly={anomaly}
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
                title={`${numeral(anomaly.typical).format('0.00a')} ${i18n.translate(
                  'xpack.infra.logs.analysis.anomaliesExpandedRowTypicalRateTitle',
                  {
                    defaultMessage: '{typicalCount, plural, one {message} other {messages}}',
                    values: { typicalCount: anomaly.typical },
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
                title={`${numeral(anomaly.actual).format('0.00a')} ${i18n.translate(
                  'xpack.infra.logs.analysis.anomaliesExpandedRowActualRateTitle',
                  {
                    defaultMessage: '{actualCount, plural, one {message} other {messages}}',
                    values: { actualCount: anomaly.actual },
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
