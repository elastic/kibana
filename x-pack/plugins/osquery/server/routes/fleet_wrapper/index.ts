/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getAgentPoliciesRoute } from './get_agent_policies';
import { getAgentPolicyRoute } from './get_agent_policy';
import { getAgentStatusForAgentPolicyRoute } from './get_agent_status_for_agent_policy';
import { getPackagePoliciesRoute } from './get_package_policies';
import { getAgentsRoute } from './get_agents';
import { getAgentDetailsRoute } from './get_agent_details';

export const initFleetWrapperRoutes = (router: IRouter, context: OsqueryAppContext) => {
  getAgentDetailsRoute(router, context);
  getAgentPoliciesRoute(router, context);
  getAgentPolicyRoute(router, context);
  getAgentStatusForAgentPolicyRoute(router, context);
  getPackagePoliciesRoute(router, context);
  getAgentsRoute(router, context);
};
