/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generatePath } from 'react-router-dom';
import { useLink } from '../../../../hooks';
import { AGENT_CONFIG_PATH } from '../../../../constants';
import { DETAILS_ROUTER_PATH, DETAILS_ROUTER_SUB_PATH } from '../constants';

type AgentConfigUriArgs =
  | ['list']
  | ['details', { configId: string }]
  | ['details-yaml', { configId: string }]
  | ['details-settings', { configId: string }]
  | ['datasource', { configId: string; datasourceId: string }]
  | ['add-datasource', { configId: string }];

/**
 * Returns a Uri that starts at the Agent Config Route path (`/configs/`).
 * These are good for use when needing to use React Router's redirect or
 * `history.push(routePath)`.
 * @param args
 */
export const useAgentConfigUri = (...args: AgentConfigUriArgs) => {
  switch (args[0]) {
    case 'list':
      return AGENT_CONFIG_PATH;
    case 'details':
      return generatePath(DETAILS_ROUTER_PATH, args[1]);
    case 'details-yaml':
      return `${generatePath(DETAILS_ROUTER_SUB_PATH, { ...args[1], tabId: 'yaml' })}`;
    case 'details-settings':
      return `${generatePath(DETAILS_ROUTER_SUB_PATH, { ...args[1], tabId: 'settings' })}`;
    case 'add-datasource':
      return `${generatePath(DETAILS_ROUTER_SUB_PATH, { ...args[1], tabId: 'add-datasource' })}`;
    case 'datasource':
      const [, options] = args;
      return `${generatePath(DETAILS_ROUTER_PATH, options)}?datasourceId=${options.datasourceId}`;
  }
  return '/';
};

/**
 * Returns a full Link that includes Kibana basepath (ex. `/app/ingestManager#/configs`).
 * These are good for use in `href` properties
 * @param args
 */
export const useAgentConfigLink = (...args: AgentConfigUriArgs) => {
  const BASE_URI = useLink('');
  const AGENT_CONFIG_ROUTE = useAgentConfigUri(...args);
  return `${BASE_URI}${AGENT_CONFIG_ROUTE}`;
};
