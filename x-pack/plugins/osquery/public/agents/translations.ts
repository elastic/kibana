/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const generateSelectedAgentsMessage = (numAgents: number): string => {
  if (numAgents === 0) {
    return '';
  } else if (numAgents === 1) {
    return i18n.translate('xpack.osquery.agents.oneSelectedAgentText', {
      defaultMessage: '{numAgents} agent selected.',
      values: { numAgents },
    });
  } else {
    return i18n.translate('xpack.osquery.agents.mulitpleSelectedAgentsText', {
      defaultMessage: '{numAgents} agents selected.',
      values: { numAgents },
    });
  }
};

export const ALL_AGENTS_LABEL = i18n.translate('xpack.osquery.agents.allAgentsLabel', {
  defaultMessage: `All agents`,
});

export const AGENT_PLATFORMS_LABEL = i18n.translate('xpack.osquery.agents.platformLabel', {
  defaultMessage: `Platform`,
});

export const AGENT_POLICY_LABEL = i18n.translate('xpack.osquery.agents.policyLabel', {
  defaultMessage: `Policy`,
});

export const AGENT = i18n.translate('xpack.osquery.agents.agent', {
  defaultMessage: `Agent`,
});

export const AGENT_SELECTION_LABEL = i18n.translate('xpack.osquery.agents.selectionLabel', {
  defaultMessage: `Agents`,
});
export const AGENT_QUERY = i18n.translate('xpack.osquery.agents.query', {
  defaultMessage: `Query`,
});

export const SELECT_AGENT_LABEL = i18n.translate('xpack.osquery.agents.selectAgentLabel', {
  defaultMessage: `Select agents or groups to query`,
});

export const ERROR_ALL_AGENTS = i18n.translate('xpack.osquery.agents.errorSearchDescription', {
  defaultMessage: `An error has occurred on all agents search`,
});

export const FAIL_ALL_AGENTS = i18n.translate('xpack.osquery.agents.failSearchDescription', {
  defaultMessage: `Failed to fetch agents`,
});

export const ATTACHED_QUERY = i18n.translate('xpack.osquery.agent.attachedQuery', {
  defaultMessage: `attached query`, // as in 'User attached query 5 minutes ago'
});
