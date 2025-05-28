/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { pipelineMappings } from './pipeline_mappings';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const url = `/api/ingest_pipelines/parse_csv`;

  const userName = 'ingest_user';
  const roleName = 'ingest_role';

  const userName2 = 'ingest_user_no_access';
  const roleName2 = 'ingest_role_no_access';

  const password = `${userName}-password`;

  describe('parse csv', function () {
    before(async () => {
      await security.role.create(roleName, {
        kibana: [],
        elasticsearch: {
          cluster: ['manage_pipeline', 'cluster:monitor/nodes/info'],
        },
      });

      await security.user.create(userName, {
        password,
        roles: [roleName],
      });

      await security.role.create(roleName2, {
        kibana: [],
        elasticsearch: {
          cluster: ['monitor'],
        },
      });

      await security.user.create(userName2, {
        password,
        roles: [roleName2],
      });
    });

    after(async () => {
      await security.role.delete(roleName);
      await security.user.delete(userName);
      await security.role.delete(roleName2);
      await security.user.delete(userName2);
    });

    describe('privs', () => {
      it('has access', async () => {
        await supertestWithoutAuth
          .post(url)
          .set('kbn-xsrf', 'xxx')
          .auth(userName, password)
          .send({
            file: pipelineMappings,
            copyAction: 'copy',
          })
          .expect(200);
      });

      it('no access', async () => {
        await supertestWithoutAuth
          .post(url)
          .set('kbn-xsrf', 'xxx')
          .auth(userName2, password)
          .send({
            file: pipelineMappings,
            copyAction: 'copy',
          })
          .expect(401);
      });
    });
  });
}
