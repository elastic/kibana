/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { AgentPolicy } from '../../../../ingest_manager/common';

export interface AgentPolicyPage {
  items: AgentPolicy[];
  page?: number;
  perPage?: number;
  success?: boolean;
  total?: number;
}

export interface PostPackagePolicyParams {
  agentPolicyId: string;
  packagePolicyName: string;
  name: string;
  schedule: string;
  url: string;
}

export const postMonitorConfig = createAction<PostPackagePolicyParams>('POST MONITOR CONFIG');

export const postMonitorConfigSuccess = createAction('POST MONITOR CONFIG SUCCESS');

export const postMonitorConfigFail = createAction<Error>('POST MONITOR CONFIG FAIL');

export const showEditMonitorFlyout = createAction('SHOW EDIT MONITOR FLYOUT');

export const hideEditMonitorFlyout = createAction('HIDE EDIT MONITOR FLYOUT');

export const getImAgentPolicies = createAction('GET IM AGENT POLICIES');

export const getImAgentPoliciesSuccess = createAction<AgentPolicyPage>(
  'GET IM AGENT POLICIES SUCCESS'
);

export const getImAgentPoliciesFail = createAction<Error>('GET IM AGENT POLICIES FAIL');

export const getImAgentPolicyDetail = createAction<string>('GET IM AGENT POLICY DETAIL');

export const getImAgentPolicyDetailSuccess = createAction<AgentPolicy>(
  'GET IM AGENT POLICY DETAIL SUCCESS'
);

export const getImAgentPolicyDetailFail = createAction<Error>('GET IM AGENT POLICY DETAIL FAIL');
