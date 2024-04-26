/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  ElasticApmAgentLatestVersion,
  OtelAgentLatestVersion,
} from '../../../../../common/agent_explorer';
import { isOpenTelemetryAgentName } from '../../../../../common/agent_name';
import { SERVICE_LANGUAGE_NAME, SERVICE_NAME } from '../../../../../common/es_fields/apm';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { EnvironmentsContextProvider } from '../../../../context/environments_context/environments_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { BetaBadge } from '../../../shared/beta_badge';
import { ApmEnvironmentFilter } from '../../../shared/environment_filter';
import { UnifiedSearchBar } from '../../../shared/unified_search_bar';

import * as urlHelpers from '../../../shared/links/url_helpers';
import { SuggestionsSelect } from '../../../shared/suggestions_select';
import { AgentList } from './agent_list';

const getOtelLatestAgentVersion = (
  agentTelemetryAutoVersion: string[],
  otelLatestVersion?: OtelAgentLatestVersion
) => {
  return agentTelemetryAutoVersion.length > 0
    ? otelLatestVersion?.auto_latest_version
    : otelLatestVersion?.sdk_latest_version;
};

function useAgentExplorerFetcher({ start, end }: { start: string; end: string }) {
  const {
    query: { environment, serviceName, agentLanguage, kuery },
  } = useApmParams('/settings/agent-explorer');

  return useProgressiveFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/get_agents_per_service', {
        params: {
          query: {
            environment,
            serviceName,
            agentLanguage,
            kuery,
            start,
            end,
          },
        },
      });
    },
    [environment, serviceName, agentLanguage, kuery, start, end]
  );
}

function useLatestAgentVersionsFetcher(latestAgentVersionEnabled: boolean) {
  return useFetcher(
    (callApmApi) => {
      if (latestAgentVersionEnabled) {
        return callApmApi('GET /internal/apm/get_latest_agent_versions');
      }
    },
    [latestAgentVersionEnabled]
  );
}

export function AgentExplorer() {
  const history = useHistory();

  const {
    query: { serviceName, agentLanguage },
  } = useApmParams('/settings/agent-explorer');

  const rangeFrom = 'now-24h';
  const rangeTo = 'now';

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { config } = useApmPluginContext();
  const latestAgentVersionEnabled = !isEmpty(config.latestAgentVersionsUrl);

  const agents = useAgentExplorerFetcher({ start, end });
  const { data: latestAgentVersions, status: latestAgentVersionsStatus } =
    useLatestAgentVersionsFetcher(latestAgentVersionEnabled);

  const isLoading = agents.status === FETCH_STATUS.LOADING;
  const isLatestAgentVersionsLoading = latestAgentVersionsStatus === FETCH_STATUS.LOADING;

  const agentItems = (agents.data?.items ?? []).map((agent) => ({
    ...agent,
    latestVersion: isOpenTelemetryAgentName(agent.agentName)
      ? getOtelLatestAgentVersion(
          agent.agentTelemetryAutoVersion,
          latestAgentVersions?.data?.[agent.agentName] as OtelAgentLatestVersion
        )
      : (latestAgentVersions?.data?.[agent.agentName] as ElasticApmAgentLatestVersion)
          ?.latest_version,
  }));

  const noItemsMessage = (
    <EuiEmptyPrompt
      title={
        <div>
          {i18n.translate('xpack.apm.agentExplorer.notFoundLabel', {
            defaultMessage: 'No Agents found',
          })}
        </div>
      }
      titleSize="s"
    />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <h2>
                {i18n.translate('xpack.apm.settings.agentExplorer.title', {
                  defaultMessage: 'Agent explorer',
                })}
              </h2>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <BetaBadge icon="beta" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem grow={false}>
        <EuiText color="subdued">
          {i18n.translate('xpack.apm.settings.agentExplorer.descriptionText', {
            defaultMessage: 'Agent Explorer provides an inventory and details of deployed Agents.',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem grow={false}>
        <UnifiedSearchBar showDatePicker={false} showSubmitButton={false} isClearable={false} />
      </EuiFlexItem>
      <EuiSpacer size="xs" />
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd" responsive={true}>
          <EuiFlexItem grow={false}>
            <EnvironmentsContextProvider customTimeRange={{ rangeFrom, rangeTo }}>
              <ApmEnvironmentFilter />
            </EnvironmentsContextProvider>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SuggestionsSelect
              prepend={i18n.translate('xpack.apm.agentExplorer.serviceNameSelect.label', {
                defaultMessage: 'Service name',
              })}
              defaultValue={serviceName}
              fieldName={SERVICE_NAME}
              onChange={(value) => {
                urlHelpers.push(history, {
                  query: { serviceName: value ?? '' },
                });
              }}
              placeholder={i18n.translate('xpack.apm.agentExplorer.serviceNameSelect.placeholder', {
                defaultMessage: 'All',
              })}
              start={start}
              end={end}
              dataTestSubj="agentExplorerServiceNameSelect"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SuggestionsSelect
              prepend={i18n.translate('xpack.apm.agentExplorer.agentLanguageSelect.label', {
                defaultMessage: 'Agent language',
              })}
              defaultValue={agentLanguage}
              fieldName={SERVICE_LANGUAGE_NAME}
              onChange={(value) => {
                urlHelpers.push(history, {
                  query: { agentLanguage: value ?? '' },
                });
              }}
              placeholder={i18n.translate(
                'xpack.apm.agentExplorer.agentLanguageSelect.placeholder',
                {
                  defaultMessage: 'All',
                }
              )}
              start={start}
              end={end}
              dataTestSubj="agentExplorerAgentLanguageSelect"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCallOut
          size="s"
          title={i18n.translate('xpack.apm.agentExplorer.callout.24hoursData', {
            defaultMessage: 'Information based on the last 24h',
          })}
          iconType="clock"
        />
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem>
        <AgentList
          isLoading={isLoading}
          items={agentItems}
          noItemsMessage={noItemsMessage}
          isLatestVersionsLoading={isLatestAgentVersionsLoading}
          latestVersionsFailed={!!latestAgentVersions?.error}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
