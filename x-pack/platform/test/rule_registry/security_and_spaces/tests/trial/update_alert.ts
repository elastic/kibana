/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import {
  superUser,
  obsMinReadAlertsAll,
  obsMinReadAlertsAllSpacesAll,
  obsMinAll,
  obsMinAllSpacesAll,
} from '../../../common/lib/authentication/users';
import type { User } from '../../../common/lib/authentication/types';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/internal/rac/alerts';
  const ALERTS_INDEX_URL = `${TEST_URL}/index`;
  const SPACE1 = 'space1';

  const getAPMIndexName = async (user: User) => {
    const { body: indexNames }: { body: { index_name: string[] | undefined } } =
      await supertestWithoutAuth
        .get(`${getSpaceUrlPrefix(SPACE1)}${ALERTS_INDEX_URL}`)
        .auth(user.username, user.password)
        .set('kbn-xsrf', 'true')
        .expect(200);
    const observabilityIndex = indexNames?.index_name?.find((indexName) =>
      indexName.startsWith('.alerts-observability.apm.alerts')
    );
    expect(observabilityIndex).to.eql('.alerts-observability.apm.alerts-default');
    return '.alerts-observability.apm.alerts';
  };

  describe('rbac', () => {
    describe('Users update:', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/rule_registry/alerts');
      });

      afterEach(async () => {
        await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/rule_registry/alerts');
      });

      it(`${superUser.username} should be able to update the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
          .auth(superUser.username, superUser.password)
          .set('kbn-xsrf', 'true')
          .send({
            ids: ['NoxgpHkBqbdrfX07MqXV'],
            status: 'closed',
            index: apmIndex,
            _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
          })
          .expect(200);
      });

      it(`${superUser.username} should receive a 409 if trying to update an old alert document version`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
          .auth(superUser.username, superUser.password)
          .set('kbn-xsrf', 'true')
          .send({
            ids: ['NoxgpHkBqbdrfX07MqXV'],
            status: 'closed',
            index: apmIndex,
            _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
          })
          .expect(200);

        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
          .auth(superUser.username, superUser.password)
          .set('kbn-xsrf', 'true')
          .send({
            ids: ['NoxgpHkBqbdrfX07MqXV'],
            status: 'closed',
            index: apmIndex,
            _version: Buffer.from(JSON.stringify([999, 999]), 'utf8').toString('base64'),
          })
          .expect(409);
      });

      it(`${obsMinReadAlertsAllSpacesAll.username} should NOT be able to update the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
          .auth(obsMinReadAlertsAllSpacesAll.username, obsMinReadAlertsAllSpacesAll.password)
          .set('kbn-xsrf', 'true')
          .send({
            ids: ['NoxgpHkBqbdrfX07MqXV'],
            status: 'closed',
            index: apmIndex,
            _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
          })
          .expect(404);
      });

      it(`${obsMinReadAlertsAll.username} should NOT be able to update the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
          .auth(obsMinReadAlertsAll.username, obsMinReadAlertsAll.password)
          .set('kbn-xsrf', 'true')
          .send({
            ids: ['NoxgpHkBqbdrfX07MqXV'],
            status: 'closed',
            index: apmIndex,
            _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
          })
          .expect(404);
      });

      it(`${obsMinAll.username} should NOT be able to update the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
          .auth(obsMinAll.username, obsMinAll.password)
          .set('kbn-xsrf', 'true')
          .send({
            ids: ['NoxgpHkBqbdrfX07MqXV'],
            status: 'closed',
            index: apmIndex,
            _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
          })
          .expect(404);
      });

      it(`${obsMinAllSpacesAll.username} should NOT be able to update the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
          .auth(obsMinAllSpacesAll.username, obsMinAllSpacesAll.password)
          .set('kbn-xsrf', 'true')
          .send({
            ids: ['NoxgpHkBqbdrfX07MqXV'],
            status: 'closed',
            index: apmIndex,
            _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
          })
          .expect(404);
      });
    });
  });
};
