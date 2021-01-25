/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
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
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import useMeasure from 'react-use/lib/useMeasure';
import { FormattedMessage } from '@kbn/i18n/react';
import semverGte from 'semver/functions/gte';
import semverCoerce from 'semver/functions/coerce';
import { createStateContainerReactHelpers } from '../../../../../../../../../../../src/plugins/kibana_utils/public';
import { RedirectAppLinks } from '../../../../../../../../../../../src/plugins/kibana_react/public';
import { TimeRange, esKuery } from '../../../../../../../../../../../src/plugins/data/public';
import { LogStream } from '../../../../../../../../../infra/public';
import { Agent } from '../../../../../types';
import { useStartServices } from '../../../../../hooks';
import { DEFAULT_DATE_RANGE } from './constants';
import { DatasetFilter } from './filter_dataset';
import { LogLevelFilter } from './filter_log_level';
import { LogQueryBar } from './query_bar';
import { buildQuery } from './build_query';
import { SelectLogLevel } from './select_log_level';

const WrapperFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

const DatePickerFlexItem = styled(EuiFlexItem)`
  max-width: 312px;
`;

export interface AgentLogsProps {
  agent: Agent;
  state: AgentLogsState;
}

export interface AgentLogsState {
  start: string;
  end: string;
  logLevels: string[];
  datasets: string[];
  query: string;
}

export const AgentLogsUrlStateHelper = createStateContainerReactHelpers();

export const AgentLogsUI: React.FunctionComponent<AgentLogsProps> = memo(({ agent, state }) => {
  const { data, application, http } = useStartServices();
  const { update: updateState } = AgentLogsUrlStateHelper.useTransitions();

  // Util to convert date expressions (returned by datepicker) to timestamps (used by LogStream)
  const getDateRangeTimestamps = useCallback(
    (timeRange: TimeRange) => {
      const { min, max } = data.query.timefilter.timefilter.calculateBounds(timeRange);
      return min && max
        ? {
            start: min.valueOf(),
            end: max.valueOf(),
          }
        : undefined;
    },
    [data.query.timefilter.timefilter]
  );

  const tryUpdateDateRange = useCallback(
    (timeRange: TimeRange) => {
      const timestamps = getDateRangeTimestamps(timeRange);
      if (timestamps) {
        updateState({
          start: timeRange.from,
          end: timeRange.to,
        });
      }
    },
    [getDateRangeTimestamps, updateState]
  );

  const [dateRangeTimestamps, setDateRangeTimestamps] = useState<{ start: number; end: number }>(
    getDateRangeTimestamps({
      from: state.start,
      to: state.end,
    }) ||
      getDateRangeTimestamps({
        from: DEFAULT_DATE_RANGE.start,
        to: DEFAULT_DATE_RANGE.end,
      })!
  );

  // Attempts to parse for timestamps when start/end date expressions change
  // If invalid date expressions, set expressions back to default
  // Otherwise set the new timestamps
  useEffect(() => {
    const timestampsFromDateRange = getDateRangeTimestamps({
      from: state.start,
      to: state.end,
    });
    if (!timestampsFromDateRange) {
      tryUpdateDateRange({
        from: DEFAULT_DATE_RANGE.start,
        to: DEFAULT_DATE_RANGE.end,
      });
    } else {
      setDateRangeTimestamps(timestampsFromDateRange);
    }
  }, [state.start, state.end, getDateRangeTimestamps, tryUpdateDateRange]);

  // Query validation helper
  const isQueryValid = useCallback((testQuery: string) => {
    try {
      esKuery.fromKueryExpression(testQuery);
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  // User query state
  const [draftQuery, setDraftQuery] = useState<string>(state.query);
  const [isDraftQueryValid, setIsDraftQueryValid] = useState<boolean>(isQueryValid(state.query));
  const onUpdateDraftQuery = useCallback(
    (newDraftQuery: string, runQuery?: boolean) => {
      setDraftQuery(newDraftQuery);
      if (isQueryValid(newDraftQuery)) {
        setIsDraftQueryValid(true);
        if (runQuery) {
          updateState({ query: newDraftQuery });
        }
      } else {
        setIsDraftQueryValid(false);
      }
    },
    [isQueryValid, updateState]
  );

  // Build final log stream query from agent id, datasets, log levels, and user input
  const logStreamQuery = useMemo(
    () =>
      buildQuery({
        agentId: agent.id,
        datasets: state.datasets,
        logLevels: state.logLevels,
        userQuery: state.query,
      }),
    [agent.id, state.datasets, state.logLevels, state.query]
  );

  // Generate URL to pass page state to Logs UI
  const viewInLogsUrl = useMemo(
    () =>
      http.basePath.prepend(
        url.format({
          pathname: '/app/logs/stream',
          search: stringify(
            {
              logPosition: encode({
                start: state.start,
                end: state.end,
                streamLive: false,
              }),
              logFilter: encode({
                expression: logStreamQuery,
                kind: 'kuery',
              }),
            },
            { sort: false, encode: false }
          ),
        })
      ),
    [http.basePath, state.start, state.end, logStreamQuery]
  );

  const [logsPanelRef, { height: logPanelHeight }] = useMeasure<HTMLDivElement>();

  const agentVersion = agent.local_metadata?.elastic?.agent?.version;
  const isLogFeatureAvailable = useMemo(() => {
    if (!agentVersion) {
      return false;
    }
    const agentVersionWithPrerelease = semverCoerce(agentVersion)?.version;
    if (!agentVersionWithPrerelease) {
      return false;
    }
    return semverGte(agentVersionWithPrerelease, '7.11.0');
  }, [agentVersion]);

  if (!isLogFeatureAvailable) {
    return (
      <EuiCallOut
        size="m"
        color="warning"
        title={
          <FormattedMessage
            id="xpack.fleet.agentLogs.oldAgentWarningTitle"
            defaultMessage="The Logs view requires Elastic Agent 7.11 or higher. To upgrade an agent, go to the Actions menu, or {downloadLink} a newer version."
            values={{
              downloadLink: (
                <EuiLink href="https://ela.st/download-elastic-agent" external target="_blank">
                  <FormattedMessage
                    id="xpack.fleet.agentLogs.downloadLink"
                    defaultMessage="download"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      />
    );
  }

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
                selectedDatasets={state.datasets}
                onToggleDataset={(dataset: string) => {
                  const currentDatasets = [...state.datasets];
                  const datasetPosition = currentDatasets.indexOf(dataset);
                  if (datasetPosition >= 0) {
                    currentDatasets.splice(datasetPosition, 1);
                    updateState({ datasets: currentDatasets });
                  } else {
                    updateState({ datasets: [...state.datasets, dataset] });
                  }
                }}
              />
              <LogLevelFilter
                selectedLevels={state.logLevels}
                onToggleLevel={(level: string) => {
                  const currentLevels = [...state.logLevels];
                  const levelPosition = currentLevels.indexOf(level);
                  if (levelPosition >= 0) {
                    currentLevels.splice(levelPosition, 1);
                    updateState({ logLevels: currentLevels });
                  } else {
                    updateState({ logLevels: [...state.logLevels, level] });
                  }
                }}
              />
            </EuiFilterGroup>
          </EuiFlexItem>
          <DatePickerFlexItem grow={false}>
            <EuiSuperDatePicker
              showUpdateButton={false}
              start={state.start}
              end={state.end}
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
        <EuiPanel paddingSize="none" panelRef={logsPanelRef}>
          <LogStream
            height={logPanelHeight}
            startTimestamp={dateRangeTimestamps.start}
            endTimestamp={dateRangeTimestamps.end}
            query={logStreamQuery}
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SelectLogLevel agent={agent} />
      </EuiFlexItem>
    </WrapperFlexGroup>
  );
});
