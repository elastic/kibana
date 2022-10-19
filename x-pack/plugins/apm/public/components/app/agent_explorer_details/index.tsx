/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { AgentExplorerFieldName } from '@kbn/apm-plugin/common/agent_explorer';
import { i18n } from '@kbn/i18n';
import { capitalize, uniqBy } from 'lodash';
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

function useServicesMainStatisticsFetcher() {
	const {
		query: {
			environment,
			serviceName,
			agentName,
			kuery,
			page = 0,
			pageSize = INITIAL_PAGE_SIZE,
			sortDirection,
			sortField,
		},
	} = useApmParams('/agent-explorer');

	const { start, end } = useTimeRange({ rangeFrom: 'now-24h', rangeTo: 'now' });

	return useProgressiveFetcher(
		(callApmApi) => {
			if (start && end) {
				return callApmApi('GET /internal/apm/agent_explorer', {
					params: {
						query: {
							environment,
							serviceName,
							agentName,
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
			agentName,
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
}

export function AgentExplorerDetails() {
	const history = useHistory();

	const {
		query: { serviceName, agentName, sortField, sortDirection },
	} = useApmParams('/agent-explorer');

	const agentsReq = useServicesMainStatisticsFetcher();
	const agents = (agentsReq.data?.items ?? [])
		.map((agent) => ({
			serviceName: agent.serviceName,
			environments: agent.environments,
			agentName: agent.agents?.[0]?.name,
			agentVersions: agent.agents?.[0]?.versions,
			latestVersion: '',
			instances: agent.instances,
		}));

	const isLoading = agentsReq.status === FETCH_STATUS.LOADING;

	const serviceNameOptions = uniqBy(
		agents.map((service) => ({ label: service.serviceName, value: service.serviceName })),
		'value',
	);

	const agentLanguageOptions = uniqBy(
		agents.map((service) => ({ label: capitalize(service.agentName ?? ''), value: service.agentName ?? '' })),
		'value',
	).filter((option) => option.label !== '');

	const isFailure = agentsReq.status === FETCH_STATUS.FAILURE;
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
								defaultMessage: 'service.name',
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
						isLoading={isLoading}
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
								defaultMessage: 'agent.language',
							}
						)}
						options={agentLanguageOptions}
						value={agentName}
						placeholder={i18n.translate(
							'xpack.apm.agentExplorer.agentLanguageSelect.placeholder',
							{
								defaultMessage: 'All',
							}
						)}
						isLoading={isLoading}
						onChange={(value) => {
							urlHelpers.push(history, {
								query: { agentName: value ?? '' },
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
					items={agents}
					initialSortField={AgentExplorerFieldName.Instances}
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
