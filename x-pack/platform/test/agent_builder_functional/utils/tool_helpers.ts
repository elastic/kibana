/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

/**
 * Deletes all user-created tools. Uses allSettled so built-in tools that
 * cannot be deleted do not cause the cleanup to fail.
 */
export async function deleteAllTools(supertest: SuperTest.Agent) {
  const response = await supertest.get('/api/agent_builder/tools').expect(200);
  const tools: Array<{ id: string; readonly: boolean }> = response.body.results || [];

  await Promise.allSettled(
    tools
      .filter(({ readonly }) => !readonly)
      .map(({ id }) => supertest.delete(`/api/agent_builder/tools/${id}`).set('kbn-xsrf', 'true'))
  );
}
