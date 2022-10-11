/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useApmParams } from '../../../hooks/use_apm_params';
import { KueryBar } from '../../shared/kuery_bar';
import * as urlHelpers from '../../shared/links/url_helpers';
import { FilterSelect } from './filter_select';

export function AgentExplorerDetails() {
	const history = useHistory();
  
  const {
    query: { serviceName, agentLanguage },
  } = useApmParams('/agent-explorer');

	const serviceNameOptions: Array<EuiComboBoxOptionOption<string>> = [];
	const agentLanguageOptions: Array<EuiComboBoxOptionOption<string>> = [];

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
							'xpack.apm.agentsExplorer.serviceNameSelect.label',
							{
								defaultMessage: 'service.name',
							}
						)}
						options={serviceNameOptions}
						value={serviceName}
						placeholder={i18n.translate(
							'xpack.apm.agentsExplorer.serviceNameSelect.placeholder',
							{
								defaultMessage: 'All',
							}
						)}
						onChange={(value) => {
							urlHelpers.push(history, {
								query: { serviceName: value ?? '' },
							});
						}}
						dataTestSubj='agentsExplorerServiceNameSelect'
					/>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>
					<FilterSelect
						title={i18n.translate(
							'xpack.apm.agentsExplorer.agentLanguageSelect.label',
							{
								defaultMessage: 'agent.name',
							}
						)}
						options={agentLanguageOptions}
						value={agentLanguage}
						placeholder={i18n.translate(
							'xpack.apm.agentsExplorer.agentLanguageSelect.placeholder',
							{
								defaultMessage: 'All',
							}
						)}
						onChange={(value) => {
							urlHelpers.push(history, {
								query: { agentLanguage: value ?? '' },
							});
						}}
						dataTestSubj='agentsExplorerAgentLanguageSelect'
					/>
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiFlexGroup>
	);
};
