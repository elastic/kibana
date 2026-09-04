/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type {
  RunCaseWorkflowRequest,
  RunCaseWorkflowResponse,
} from '@kbn/cases-plugin/common/types/api';
import { getRunCaseWorkflowUrl } from '@kbn/cases-plugin/common/api';
import type { User } from '../authentication/types';
import { superUser } from '../authentication/users';
import { getSpaceUrlPrefix, setupAuth } from './helpers';

/** Workflow management API version required by the public versioned routes. */
const WORKFLOWS_API_VERSION = '2023-10-31';

/**
 * Creates a workflow via POST /api/workflows/workflow.
 * Returns the created workflow id.
 */
export const createWorkflow = async ({
  supertest: st,
  yaml,
  auth = { user: superUser, space: null },
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.Agent;
  yaml: string;
  auth?: { user: User; space: string | null } | null;
  expectedHttpCode?: number;
}): Promise<string> => {
  const apiCall = st.post(`${getSpaceUrlPrefix(auth?.space)}/api/workflows/workflow`);

  void setupAuth({ apiCall, headers: {}, auth });

  const { body } = await apiCall
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', WORKFLOWS_API_VERSION)
    .send({ yaml })
    .expect(expectedHttpCode);

  return (body as { id: string }).id;
};

/**
 * Deletes a workflow via DELETE /api/workflows/workflow/{workflowId}?force=true.
 */
export const deleteWorkflow = async ({
  supertest: st,
  workflowId,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  workflowId: string;
  auth?: { user: User; space: string | null } | null;
}): Promise<void> => {
  const apiCall = st.delete(
    `${getSpaceUrlPrefix(auth?.space)}/api/workflows/workflow/${workflowId}?force=true`
  );

  void setupAuth({ apiCall, headers: {}, auth });

  await apiCall
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', WORKFLOWS_API_VERSION)
    .expect(200);
};

/**
 * Calls POST /internal/cases/workflows/{workflowId}/run.
 * Returns the parsed body; callers should assert on expectedHttpCode and the body shape.
 */
export const runCaseWorkflow = async ({
  supertest: st,
  workflowId,
  params,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
  headers = {},
}: {
  supertest: SuperTest.Agent;
  workflowId: string;
  params: RunCaseWorkflowRequest;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null } | null;
  headers?: Record<string, string | string[]>;
}): Promise<RunCaseWorkflowResponse> => {
  const apiCall = st.post(`${getSpaceUrlPrefix(auth?.space)}${getRunCaseWorkflowUrl(workflowId)}`);

  void setupAuth({ apiCall, headers, auth });

  const { body } = await apiCall
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'foo')
    .set(headers)
    .send(params)
    .expect(expectedHttpCode);

  return body as RunCaseWorkflowResponse;
};
