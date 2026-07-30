/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { EVALS_TRACING_PROJECTS_URL, type GetTracingProjectsResponse } from '@kbn/evals-common';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';
import { getEvalsApiClientForRole } from './helpers/api_client';
import { seedTracingProjects, uniqueSuffix } from './helpers/fixtures';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const es = getService('es');

  let adminClient: SupertestWithRoleScopeType;

  describe('Evals - Tracing projects', function () {
    const suffix = uniqueSuffix();
    const traceIndex = `traces-evals-projects-ftr-${suffix}`;
    // Enough distinct projects that a single aggregation nesting `trace_ids` under
    // every project bucket would exceed the default `search.max_buckets`.
    const projectNamePrefix = `ftrproj${suffix}`;
    const projectCount = 40;
    const tracesPerProject = 2;
    const inputTokens = 100;
    const outputTokens = 50;

    before(async () => {
      adminClient = await getEvalsApiClientForRole(roleScopedSupertest, 'admin');

      await seedTracingProjects(
        es,
        traceIndex,
        Array.from({ length: projectCount }, (_unused, index) => ({
          name: `${projectNamePrefix}-${String(index).padStart(3, '0')}`,
          traceCount: tracesPerProject,
          inputTokens,
          outputTokens,
        }))
      );
    });

    after(async () => {
      await adminClient.destroy();
      await es.indices.delete({ index: traceIndex }).catch(() => {
        // best-effort cleanup
      });
    });

    it('returns a page of projects for a large number of distinct project names', async () => {
      const { body } = await adminClient
        .get(EVALS_TRACING_PROJECTS_URL)
        .query({ name: projectNamePrefix, page: 1, per_page: 25 })
        .expect(200);

      const { projects, total } = body as GetTracingProjectsResponse;

      expect(total).to.eql(projectCount);
      expect(projects.length).to.eql(25);
      projects.forEach((project) => {
        expect(project.name).to.contain(projectNamePrefix);
        expect(project.trace_count).to.eql(tracesPerProject);
        expect(project.error_rate).to.eql(0);
      });
    });

    it('aggregates token usage from child spans per project', async () => {
      const { body } = await adminClient
        .get(EVALS_TRACING_PROJECTS_URL)
        .query({ name: `${projectNamePrefix}-000`, page: 1, per_page: 25 })
        .expect(200);

      const { projects, total } = body as GetTracingProjectsResponse;

      expect(total).to.eql(1);
      expect(projects[0].name).to.eql(`${projectNamePrefix}-000`);
      expect(projects[0].total_tokens).to.eql(tracesPerProject * (inputTokens + outputTokens));
    });

    it('returns the remaining projects on the last page', async () => {
      const { body } = await adminClient
        .get(EVALS_TRACING_PROJECTS_URL)
        .query({ name: projectNamePrefix, page: 2, per_page: 25 })
        .expect(200);

      const { projects, total } = body as GetTracingProjectsResponse;

      expect(total).to.eql(projectCount);
      expect(projects.length).to.eql(projectCount - 25);
    });
  });
}
