/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo, useState, useCallback } from 'react';
import styled from 'styled-components';
import url from 'url';
import { encode } from 'rison-node';
import { stringify } from 'query-string';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  EuiFilterGroup,
  EuiPanel,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { RedirectAppLinks } from '../../../../../../../../../../../src/plugins/kibana_react/public';
import { TimeRange, esKuery } from '../../../../../../../../../../../src/plugins/data/public';
import { LogStream } from '../../../../../../../../../infra/public';
import { Agent } from '../../../../../types';
import { useStartServices } from '../../../../../hooks';
import { DATASET_FIELD, AGENT_DATASET, LOG_LEVEL_FIELD, AGENT_ID_FIELD } from './constants';
import { DatasetFilter } from './filter_dataset';
import { LogLevelFilter } from './filter_log_level';
import { LogQueryBar } from './query_bar';

const DEFAULT_DATE_RANGE = {
  start: 'now-15m',
  end: 'now',
};

const WrapperFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

const DatePickerFlexItem = styled(EuiFlexItem)`
  max-width: 312px;
`;

export const AgentLogs: React.FunctionComponent<{ agent: Agent }> = memo(({ agent }) => {
  const { data, application, http } = useStartServices();

  // Util to convert date expressions (returned by datepicker) to timestamps (used by LogStream)
  const getDateRangeTimestamps = useCallback(
    (timeRange: TimeRange) => {
      const { min, max } = data.query.timefilter.timefilter.calculateBounds(timeRange);
      return min && max
        ? {
            startTimestamp: min.valueOf(),
            endTimestamp: max.valueOf(),
          }
        : undefined;
    },
    [data.query.timefilter.timefilter]
  );

  // Initial time range filter
  const [dateRange, setDateRange] = useState<{
    startExpression: string;
    endExpression: string;
    startTimestamp: number;
    endTimestamp: number;
  }>({
    startExpression: DEFAULT_DATE_RANGE.start,
    endExpression: DEFAULT_DATE_RANGE.end,
    ...getDateRangeTimestamps({ from: DEFAULT_DATE_RANGE.start, to: DEFAULT_DATE_RANGE.end })!,
  });

  const tryUpdateDateRange = useCallback(
    (timeRange: TimeRange) => {
      const timestamps = getDateRangeTimestamps(timeRange);
      if (timestamps) {
        setDateRange({
          startExpression: timeRange.from,
          endExpression: timeRange.to,
          ...timestamps,
        });
      }
    },
    [getDateRangeTimestamps]
  );

  // Filters
  const [selectedLogLevels, setSelectedLogLevels] = useState<string[]>([]);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([AGENT_DATASET]);

  // User query state
  const [query, setQuery] = useState<string>('');
  const [draftQuery, setDraftQuery] = useState<string>('');
  const [isDraftQueryValid, setIsDraftQueryValid] = useState<boolean>(true);
  const onUpdateDraftQuery = useCallback((newDraftQuery: string, runQuery?: boolean) => {
    setDraftQuery(newDraftQuery);
    try {
      esKuery.fromKueryExpression(newDraftQuery);
      setIsDraftQueryValid(true);
      if (runQuery) {
        setQuery(newDraftQuery);
      }
    } catch (err) {
      setIsDraftQueryValid(false);
    }
  }, []);

  // Base queries: agent id, dataset, log level
  const AGENT_QUERY = useMemo(() => {
    const agentQuery = `${AGENT_ID_FIELD.name}:${agent.id}`;
    const datasetQuery = selectedDatasets.length
      ? selectedDatasets.map((dataset) => `${DATASET_FIELD.name}:${dataset}`).join(' or ')
      : `${DATASET_FIELD.name}:${AGENT_DATASET} or ${DATASET_FIELD.name}:${AGENT_DATASET}.*`;
    return `${agentQuery} and (${datasetQuery})`;
  }, [agent.id, selectedDatasets]);
  const LOG_LEVEL_QUERY = useMemo(
    () => selectedLogLevels.map((level) => `${LOG_LEVEL_FIELD.name}:${level}`).join(' or '),
    [selectedLogLevels]
  );
  const BASE_QUERY = useMemo(
    () => (LOG_LEVEL_QUERY ? `(${AGENT_QUERY}) and (${LOG_LEVEL_QUERY})` : AGENT_QUERY),
    [AGENT_QUERY, LOG_LEVEL_QUERY]
  );

  // Final query: base + user queries
  const LOG_STREAM_QUERY = useMemo(() => (query ? `(${BASE_QUERY}) and (${query})` : BASE_QUERY), [
    BASE_QUERY,
    query,
  ]);

  const viewInLogsUrl = useMemo(
    () =>
      http.basePath.prepend(
        url.format({
          pathname: '/app/logs/stream',
          search: stringify(
            {
              logPosition: encode({
                start: dateRange.startExpression,
                end: dateRange.endExpression,
                streamLive: false,
              }),
              logFilter: encode({
                expression: LOG_STREAM_QUERY,
                kind: 'kuery',
              }),
            },
            { sort: false, encode: false }
          ),
        })
      ),
    [LOG_STREAM_QUERY, dateRange.endExpression, dateRange.startExpression, http.basePath]
  );

  return (
    <WrapperFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <LogQueryBar
              query={draftQuery}
              onUpdateQuery={onUpdateDraftQuery}
              isQueryValid={isDraftQueryValid}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <DatasetFilter
                selectedDatasets={selectedDatasets}
                onToggleDataset={(level: string) => {
                  const currentLevels = [...selectedDatasets];
                  const levelPosition = currentLevels.indexOf(level);
                  if (levelPosition >= 0) {
                    currentLevels.splice(levelPosition, 1);
                    setSelectedDatasets(currentLevels);
                  } else {
                    setSelectedDatasets([...selectedDatasets, level]);
                  }
                }}
              />
              <LogLevelFilter
                selectedLevels={selectedLogLevels}
                onToggleLevel={(level: string) => {
                  const currentLevels = [...selectedLogLevels];
                  const levelPosition = currentLevels.indexOf(level);
                  if (levelPosition >= 0) {
                    currentLevels.splice(levelPosition, 1);
                    setSelectedLogLevels(currentLevels);
                  } else {
                    setSelectedLogLevels([...selectedLogLevels, level]);
                  }
                }}
              />
            </EuiFilterGroup>
          </EuiFlexItem>
          <DatePickerFlexItem grow={false}>
            <EuiSuperDatePicker
              showUpdateButton={false}
              start={dateRange.startExpression}
              end={dateRange.endExpression}
              onTimeChange={({ start, end }) => {
                tryUpdateDateRange({
                  from: start,
                  to: end,
                });
              }}
            />
          </DatePickerFlexItem>
          <EuiFlexItem grow={false}>
            <RedirectAppLinks application={application}>
              <EuiButtonEmpty href={viewInLogsUrl} iconType="popout" flush="both">
                <FormattedMessage
                  id="xpack.fleet.agentLogs.openInLogsUiLinkText"
                  defaultMessage="Open in Logs"
                />
              </EuiButtonEmpty>
            </RedirectAppLinks>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="none">
          <LogStream
            height="100%"
            startTimestamp={dateRange.startTimestamp}
            endTimestamp={dateRange.endTimestamp}
            query={LOG_STREAM_QUERY}
          />
        </EuiPanel>
      </EuiFlexItem>
    </WrapperFlexGroup>
  );
});
