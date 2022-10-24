/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { AgentExplorerFieldName } from '@kbn/apm-plugin/common/agent_explorer';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import uuid from 'uuid';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { KueryBar } from '../../shared/kuery_bar';
import * as urlHelpers from '../../shared/links/url_helpers';
import { AgentList } from './agent_list';
import { orderAgentItems } from './agent_list/order_agent_items';
import { FilterSelect } from './filter_select';

const INITIAL_PAGE_SIZE = 25;

function useAgentExplorerFetcher() {
	const {
		query: {
			environment,
			serviceName,
			agentLanguage,
			kuery,
			page = 0,
			pageSize = INITIAL_PAGE_SIZE,
			sortDirection,
			sortField,
		},
	} = useApmParams('/agent-explorer');

	const { start, end } = useTimeRange({ rangeFrom: 'now-24h', rangeTo: 'now' });

	const filters = useProgressiveFetcher(
		(callApmApi) => {
			return callApmApi('GET /internal/apm/agent_explorer/filters', {
				params: {
					query: {
						environment,
						start,
						end,
					},
				},
			});
		},
		[
			environment,
			start,
			end,
		]
	);

	const agents = useProgressiveFetcher(
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
				}).then((mainStatisticsData) => {
					return {
						requestId: uuid(),
						...mainStatisticsData,
					};
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
			// not used, but needed to update the requestId to call the details statistics API when table is options are updated
			page,
			pageSize,
			sortField,
			sortDirection,
		]
	);

	return {
		agents,
		filters,
	}
}

export function AgentExplorerDetails() {
	const history = useHistory();

	const {
		query: { serviceName, agentLanguage },
	} = useApmParams('/agent-explorer');

	const { agents, filters } =
		useAgentExplorerFetcher();

	const isLoading = agents.status === FETCH_STATUS.LOADING;
	const isFilterLoading = filters.status === FETCH_STATUS.LOADING;

	const serviceNameOptions = (filters.data?.services ?? []).map((service) => ({ label: service, value: service }));
	const agentLanguageOptions = (filters.data?.languages ?? []).map((language) => ({ label: language, value: language }));

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
			<EuiFlexGroup justifyContent='flexEnd'>
				<EuiFlexItem grow={false}>
					<FilterSelect
						title={i18n.translate(
							'xpack.apm.agentExplorer.serviceNameSelect.label',
							{
								defaultMessage: 'Service name',
							}
						)}
						options={serviceNameOptions}
						value={serviceName}
						placeholder={i18n.translate(
							'xpack.apm.agentExplorer.serviceNameSelect.placeholder',
							{
								defaultMessage: 'All',
							}
						)}
						isLoading={isFilterLoading}
						onChange={(value) => {
							urlHelpers.push(history, {
								query: { serviceName: value ?? '' },
							});
						}}
						dataTestSubj='agentExplorerServiceNameSelect'
					/>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>
					<FilterSelect
						title={i18n.translate(
							'xpack.apm.agentExplorer.agentLanguageSelect.label',
							{
								defaultMessage: 'Agent language',
							}
						)}
						options={agentLanguageOptions}
						value={agentLanguage}
						placeholder={i18n.translate(
							'xpack.apm.agentExplorer.agentLanguageSelect.placeholder',
							{
								defaultMessage: 'All',
							}
						)}
						isLoading={isFilterLoading}
						onChange={(value) => {
							urlHelpers.push(history, {
								query: { agentLanguage: value ?? '' },
							});
						}}
						dataTestSubj='agentExplorerAgentLanguageSelect'
					/>
				</EuiFlexItem>
			</EuiFlexGroup>
			<EuiSpacer />
			<EuiFlexItem>
				<AgentList
					isLoading={isLoading}
					isFailure={isFailure}
					items={agents.data?.items ?? []}
					initialSortField={AgentExplorerFieldName.Environments}
					initialSortDirection='desc'
					sortFn={(itemsToSort, sortField, sortDirection) => {
						return orderAgentItems({
							items: itemsToSort,
							primarySortField: sortField,
							sortDirection,
						});
					}}
					noItemsMessage={noItemsMessage}
					initialPageSize={INITIAL_PAGE_SIZE}
				/>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
};
