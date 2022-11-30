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
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  SERVICE_LANGUAGE_NAME,
  SERVICE_NAME,
} from '../../../../../common/es_fields/apm';
import { EnvironmentsContextProvider } from '../../../../context/environments_context/environments_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { ApmEnvironmentFilter } from '../../../shared/environment_filter';
import { KueryBar } from '../../../shared/kuery_bar';
import * as urlHelpers from '../../../shared/links/url_helpers';
import { SuggestionsSelect } from '../../../shared/suggestions_select';
import { TechnicalPreviewBadge } from '../../../shared/technical_preview_badge';
import { AgentList } from './agent_list';

function useAgentExplorerFetcher({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
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

export function AgentExplorer() {
  const history = useHistory();

  const {
    query: { serviceName, agentLanguage },
  } = useApmParams('/settings/agent-explorer');

  const rangeFrom = 'now-24h';
  const rangeTo = 'now';

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const agents = useAgentExplorerFetcher({ start, end });

  const isLoading = agents.status === FETCH_STATUS.LOADING;

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
        <EuiText color="subdued">
          {i18n.translate('xpack.apm.settings.agentExplorer.descriptionText', {
            defaultMessage:
              'Agent Explorer Technical Preview provides an inventory and details of deployed Agents.',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiSpacer size="s" />
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
              <TechnicalPreviewBadge icon="beaker" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem grow={false}>
        <KueryBar />
      </EuiFlexItem>
      <EuiSpacer size="xs" />
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd" responsive={true}>
          <EuiFlexItem grow={false}>
            <EnvironmentsContextProvider
              customTimeRange={{ rangeFrom, rangeTo }}
            >
              <ApmEnvironmentFilter />
            </EnvironmentsContextProvider>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SuggestionsSelect
              prepend={i18n.translate(
                'xpack.apm.agentExplorer.serviceNameSelect.label',
                {
                  defaultMessage: 'Service name',
                }
              )}
              defaultValue={serviceName}
              fieldName={SERVICE_NAME}
              onChange={(value) => {
                urlHelpers.push(history, {
                  query: { serviceName: value ?? '' },
                });
              }}
              placeholder={i18n.translate(
                'xpack.apm.agentExplorer.serviceNameSelect.placeholder',
                {
                  defaultMessage: 'All',
                }
              )}
              start={start}
              end={end}
              dataTestSubj="agentExplorerServiceNameSelect"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SuggestionsSelect
              prepend={i18n.translate(
                'xpack.apm.agentExplorer.agentLanguageSelect.label',
                {
                  defaultMessage: 'Agent language',
                }
              )}
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
            defaultMessage: 'Information based on the lastest 24h',
          })}
          iconType="clock"
        />
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem>
        <AgentList
          isLoading={isLoading}
          items={agents.data?.items ?? []}
          noItemsMessage={noItemsMessage}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
