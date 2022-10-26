/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
	SERVICE_LANGUAGE_NAME, SERVICE_NAME
} from '../../../../common/elasticsearch_fieldnames';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { KueryBar } from '../../shared/kuery_bar';
import * as urlHelpers from '../../shared/links/url_helpers';
import { SuggestionsSelect } from '../../shared/suggestions_select';
import { AgentList } from './agent_list';

function useAgentExplorerFetcher({ start, end }: {start: string; end: string}) {
	const {
		query: {
			environment,
			serviceName,
			agentLanguage,
			kuery,
		},
	} = useApmParams('/agent-explorer');

	return useProgressiveFetcher(
		(callApmApi) => {
			if (start && end) {
				return callApmApi('GET /internal/apm/agent_explorer', {
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
			}
		},
		[
			environment,
			serviceName,
			agentLanguage,
			kuery,
			start,
			end,
		]
	);
}

export function AgentExplorerDetails() {
	const history = useHistory();

	const { start, end } = useTimeRange({ rangeFrom: 'now-24h', rangeTo: 'now' });

	const {
		query: { serviceName, agentLanguage },
	} = useApmParams('/agent-explorer');

	const agents = useAgentExplorerFetcher({start, end});

	const isLoading = agents.status === FETCH_STATUS.LOADING;

	const isFailure = agents.status === FETCH_STATUS.FAILURE;

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
				<KueryBar />
			</EuiFlexItem>
			<EuiSpacer />
			<EuiFlexItem>
				<EuiFlexGroup justifyContent='flexEnd'>
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
							placeholder={i18n.translate('xpack.apm.agentExplorer.serviceNameSelect.placeholder', {
								defaultMessage: 'All',
							})}
							start={start}
							end={end}
							dataTestSubj='agentExplorerServiceNameSelect'
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
								placeholder={i18n.translate('xpack.apm.agentExplorer.agentLanguageSelect.placeholder', {
									defaultMessage: 'All',
								})}
								start={start}
								end={end}
								dataTestSubj='agentExplorerAgentLanguageSelect'
							/>
					</EuiFlexItem>
				</EuiFlexGroup>
			</EuiFlexItem>
			<EuiSpacer />
			<EuiFlexItem>
				<AgentList
					isLoading={isLoading}
					isFailure={isFailure}
					items={agents.data?.items ?? []}
					noItemsMessage={noItemsMessage}
				/>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
};
