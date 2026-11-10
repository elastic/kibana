/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');

  const pkgName = 'workflow_assets';
  const hashIdSegment = (value: string) =>
    createHash('sha256').update(value).digest('hex').slice(0, 16);
  const workflowIdPrefix = `system-fleet-package-workflow-${hashIdSegment(
    'default'
  )}-${hashIdSegment(pkgName)}`;
  // Fixture files are named `workflow_assets_<name>.yml`
  const workflowId = (name: string) => `${workflowIdPrefix}-workflow-assets-${name}`;

  const installPackage = (version: string) =>
    supertest
      .post(`/api/fleet/epm/packages/${pkgName}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);

  const uninstallPackage = (version: string) =>
    supertest.delete(`/api/fleet/epm/packages/${pkgName}/${version}`).set('kbn-xsrf', 'xxxx');

  const getInstalledWorkflowRefs = async (version: string): Promise<string[]> => {
    const { body } = await supertest
      .get(`/api/fleet/epm/packages/${pkgName}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
    return (body.item.installationInfo?.installed_kibana ?? [])
      .filter(({ type }: { type: string }) => type === 'workflow')
      .map(({ id }: { id: string }) => id)
      .sort();
  };

  const getWorkflow = (id: string) =>
    supertest
      .get(`/api/workflows/workflow/${id}`)
      .set('kbn-xsrf', 'xxxx')
      .set('elastic-api-version', '2023-10-31');

  describe('kibana/workflow assets', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    afterEach(async () => {
      await uninstallPackage('0.2.0');
      await uninstallPackage('0.1.0');
    });

    it('installs the package workflows disabled and saves their refs', async () => {
      await installPackage('0.1.0');

      expect(await getInstalledWorkflowRefs('0.1.0')).to.eql(
        [workflowId('goodbye'), workflowId('hello')].sort()
      );
      for (const name of ['hello', 'goodbye']) {
        const { body } = await getWorkflow(workflowId(name)).expect(200);
        expect(body.enabled).to.be(false);
      }
    });

    it('lists the package workflows with the workflows list visibility context', async () => {
      await installPackage('0.1.0');

      const { body } = await supertest
        .get('/api/workflows')
        .query({ managed: 'all', visibilityContext: 'list:workflows' })
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '2023-10-31')
        .expect(200);

      const listedIds = body.results.map(({ id }: { id: string }) => id);
      expect(listedIds).to.contain(workflowId('hello'));
      expect(listedIds).to.contain(workflowId('goodbye'));
    });

    it('updates the workflows on upgrade and removes the ones no longer shipped', async () => {
      await installPackage('0.1.0');
      await installPackage('0.2.0');

      expect(await getInstalledWorkflowRefs('0.2.0')).to.eql(
        [workflowId('extra'), workflowId('hello')].sort()
      );
      const { body: hello } = await getWorkflow(workflowId('hello')).expect(200);
      expect(hello.name).to.be('Hello updated');
      expect(hello.enabled).to.be(false);
      await getWorkflow(workflowId('extra')).expect(200);
      await getWorkflow(workflowId('goodbye')).expect(404);
    });

    it('removes the workflows on uninstall', async () => {
      await installPackage('0.1.0');
      await uninstallPackage('0.1.0');

      for (const name of ['hello', 'goodbye']) {
        await getWorkflow(workflowId(name)).expect(404);
      }
    });

    it('returns the workflows from bulk_get_assets', async () => {
      await installPackage('0.1.0');

      const { body } = await supertest
        .post('/api/fleet/epm/bulk_assets')
        .set('kbn-xsrf', 'xxxx')
        .send({ assetIds: [{ id: workflowId('hello'), type: 'workflow' }] })
        .expect(200);

      expect(body.items).to.have.length(1);
      expect(body.items[0].id).to.be(workflowId('hello'));
      expect(body.items[0].type).to.be('workflow');
      expect(body.items[0].attributes.title).to.be('Hello');
    });
  });
}
