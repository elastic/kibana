/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../ftr_provider_context';

export async function FleetAndAgentsProvider({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  return {
    async setup() {
      // Use elastic/fleet-server service account to execute setup to verify privilege configuration
      const { token } = await es.security.createServiceToken({
        namespace: 'elastic',
        service: 'fleet-server',
      });

      await supertestWithoutAuth
        .post(`/api/fleet/setup`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `Bearer ${token.value}`)
        .send()
        .expect(200);
      await supertestWithoutAuth
        .post(`/api/fleet/agents/setup`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `Bearer ${token.value}`)
        .send({ forceRecreate: true })
        .expect(200);
    },

    async generateAgent(
      status: string,
      id: string,
      policyId: string,
      version?: string,
      upgradeDetails?: any,
      upgradedAt?: string,
      refresh?: boolean
    ) {
      let data: any = {};

      switch (status) {
        case 'error':
          data = { policy_revision_idx: 1, last_checkin_status: 'error' };
          break;
        case 'degraded':
          data = { policy_revision_idx: 1, last_checkin_status: 'degraded' };
          break;
        case 'offline':
          // default inactivity timeout is 2 weeks
          // anything less + above offline timeout will be offline
          const oneWeekAgoTimestamp = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
          data = {
            policy_revision_idx: 1,
            last_checkin: new Date(oneWeekAgoTimestamp).toISOString(),
          };
          break;
        case 'inactive':
          const threeWeeksAgoTimestamp = new Date().getTime() - 21 * 24 * 60 * 60 * 1000;
          data = {
            policy_revision_idx: 1,
            last_checkin: new Date(threeWeeksAgoTimestamp).toISOString(),
          };
          break;
        // Agent with last checkin status as error and currently unenrolling => should displayd updating status
        case 'error-unenrolling':
          data = {
            policy_revision_idx: 1,
            last_checkin_status: 'error',
            unenrollment_started_at: '2017-06-07T18:59:04.498Z',
          };
          break;
        case 'uninstalled':
          data = {
            audit_unenrolled_reason: 'uninstall',
            policy_revision_idx: 1,
            last_checkin: new Date().toISOString(),
          };
          break;
        default:
          data = { policy_revision_idx: 1, last_checkin: new Date().toISOString() };
      }

      await es.index({
        index: '.fleet-agents',
        id,
        document: {
          id,
          type: 'PERMANENT',
          active: true,
          enrolled_at: new Date().toISOString(),
          last_checkin: new Date().toISOString(),
          policy_id: policyId,
          policy_revision: 1,
          agent: {
            id,
            version,
          },
          local_metadata: {
            elastic: {
              agent: {
                version,
                upgradeable: true,
              },
            },
          },
          ...data,
          ...(upgradeDetails ? { upgrade_details: upgradeDetails } : {}),
          ...(upgradedAt ? { upgraded_at: upgradedAt } : {}),
        },
        refresh: refresh ?? 'wait_for',
      });
    },
  };
}
