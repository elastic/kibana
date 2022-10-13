/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName, isElasticAgentName } from "../../../../typings/es_schemas/ui/fields/agent";

const agentNoDocs = ['otlp'];
const specialRepos = {
	'iOS/swift': 'ios',
	'android/java': 'android',
	'opentelemetry/nodejs': 'js',
	'opentelemetry/webjs': 'js',
};

function getLinkDetails(agentName: AgentName): { user: 'elastic' | 'open-telemetry'; agent: string }
{
	// @ts-ignore
	const agent = specialRepos[agentName] || agentName;

	if (isElasticAgentName(agentName)) {
		return {user: 'elastic', agent: `apm-agent-${agent}`};
	}

	return {user: 'open-telemetry', agent};
}

export function getDocsLink(agentName: AgentName) {
	if (agentNoDocs.includes(agentName)) {
		return undefined;
	}

	const {user, agent} = getLinkDetails(agentName);

	return `https://github.com/${user}/${agent}`;
}
