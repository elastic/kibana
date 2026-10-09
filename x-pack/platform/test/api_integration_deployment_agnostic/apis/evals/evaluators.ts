/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { EVALS_EVALUATORS_URL, type ListEvaluatorsResponse } from '@kbn/evals-common';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';
import { getEvalsApiClientForRole } from './helpers/api_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  let adminClient: SupertestWithRoleScopeType;
  let viewerClient: SupertestWithRoleScopeType;

  describe('Evals - Evaluators', function () {
    before(async () => {
      adminClient = await getEvalsApiClientForRole(roleScopedSupertest, 'admin');
      viewerClient = await getEvalsApiClientForRole(roleScopedSupertest, 'viewer');
    });

    after(async () => {
      await adminClient.destroy();
      await viewerClient.destroy();
    });

    it('lists the registered evaluators with read_evals (admin)', async () => {
      const { body } = await adminClient.get(EVALS_EVALUATORS_URL).expect(200);

      const response = body as ListEvaluatorsResponse;
      expect(response.evaluators.length).to.be.greaterThan(0);
      expect(response.evaluators.every((evaluator) => typeof evaluator.name === 'string')).to.be(
        true
      );
    });

    it('allows listing evaluators with read_evals (viewer)', async () => {
      await viewerClient.get(EVALS_EVALUATORS_URL).expect(200);
    });
  });
}
