/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../services';
import type { SignificantEventsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { getMaintenanceStatus, pauseMaintenance, resumeMaintenance } from './helpers/requests';
import { disableStreams, enableStreams } from '../streams/helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const samlAuth = getService('samlAuth');
  let roleAuthc: RoleCredentials;

  let apiClient: SignificantEventsSupertestRepositoryClient;

  // A guarded, rule-touching route used only as a probe: the pause guard rejects
  // it with 409 before it reaches any stream/rule work, so an unknown stream is
  // enough. After resume it runs (reporting the stream as failed), proving the
  // guard, not the missing stream, is what produced the 409.
  const reconcileProbe = (expectStatusCode: number) =>
    apiClient
      .fetch('POST /internal/streams/queries/_reconcile', {
        params: { body: { streamNames: ['logs.maintenance-probe-missing'] } },
      })
      .expect(expectStatusCode);

  describe('Maintenance API', function () {
    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    // The maintenance state is a single deployment-wide document, so always leave
    // it enabled; a leaked `paused` state would block the other suites' rule work.
    afterEach(async () => {
      await resumeMaintenance(apiClient);
    });

    it('reports the enabled state by default', async () => {
      const status = await getMaintenanceStatus(apiClient);
      expect(status.state).to.eql('enabled');
    });

    it('round-trips the state through pause and resume', async () => {
      const paused = await pauseMaintenance(apiClient);
      expect(paused.state).to.eql('paused');
      expect(await getMaintenanceStatus(apiClient).then((s) => s.state)).to.eql('paused');

      const resumed = await resumeMaintenance(apiClient);
      expect(resumed.state).to.eql('enabled');
      expect(await getMaintenanceStatus(apiClient).then((s) => s.state)).to.eql('enabled');
    });

    it('rejects rule-touching routes with 409 while paused and allows them once resumed', async () => {
      await reconcileProbe(200);

      await pauseMaintenance(apiClient);
      await reconcileProbe(409);

      await resumeMaintenance(apiClient);
      await reconcileProbe(200);
    });

    it('is idempotent: pausing twice keeps the paused state', async () => {
      const first = await pauseMaintenance(apiClient);
      const second = await pauseMaintenance(apiClient);

      expect(first.state).to.eql('paused');
      expect(second.state).to.eql('paused');
      expect(await getMaintenanceStatus(apiClient).then((s) => s.state)).to.eql('paused');
    });

    it('is idempotent: resuming while enabled is a no-op', async () => {
      const resumed = await resumeMaintenance(apiClient);
      expect(resumed.state).to.eql('enabled');
      expect(await getMaintenanceStatus(apiClient).then((s) => s.state)).to.eql('enabled');
    });
  });
}
