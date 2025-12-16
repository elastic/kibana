/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { buildEsQuery } from '@kbn/es-query';

import { bulkGetDocs } from '../../../common/lib/helpers/bulk_get_docs';
import { bulkUpdateAlertTags } from '../../../common/lib/helpers/bulk_update_alert_tags';
import {
  superUser,
  globalRead,
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  secOnlySpace2,
  secOnlyReadSpace2,
  obsSecAllSpace2,
  obsSecReadSpace2,
  obsOnlySpace2,
  obsOnlyReadSpace2,
  obsOnlySpacesAll,
  obsSecSpacesAll,
  secOnlySpacesAll,
  noKibanaPrivileges,
} from '../../../common/lib/authentication/users';

import type { User } from '../../../common/lib/authentication/types';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';

interface TestCase {
  spaceId: string;
  alertIds?: string[];
  index: string;
  authorizedUsers: User[];
  unauthorizedUsers: User[];
}

interface AlertIdsTestCase extends TestCase {
  alertIds: string[];
}

interface QueryTestCase extends TestCase {
  query: string;
  usersThatShouldNotUpdateTheTags: User[];
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');

  const addAlertIdsTests = ({
    spaceId,
    authorizedUsers,
    unauthorizedUsers,
    alertIds,
    index,
  }: AlertIdsTestCase) => {
    authorizedUsers.forEach((user) => {
      it(`${user.username} should bulk update alert tags by alert ids in ${spaceId}/${index}`, async () => {
        await bulkUpdateAlertTags({
          supertest: supertestWithoutAuth,
          spaceId,
          alertIds,
          index,
          add: [user.username],
          user,
          expectedStatusCode: 207,
        });
      });
    });

    unauthorizedUsers.forEach((user) => {
      it(`${user.username} should NOT bulk update alert tags by alert ids in ${spaceId}/${index}`, async () => {
        await bulkUpdateAlertTags({
          supertest: supertestWithoutAuth,
          spaceId,
          alertIds,
          index,
          add: [user.username],
          user,
          expectedStatusCode: 403,
        });
      });
    });
  };

  const addQueryTests = ({
    spaceId,
    authorizedUsers,
    unauthorizedUsers,
    usersThatShouldNotUpdateTheTags,
    query,
    index,
  }: QueryTestCase) => {
    authorizedUsers.forEach((user) => {
      it(`${user.username} should bulk update alert tags by query in ${spaceId}/${index}`, async () => {
        await bulkUpdateAlertTags({
          supertest: supertestWithoutAuth,
          spaceId,
          query,
          index,
          add: [user.username],
          user,
          expectedStatusCode: 207,
        });

        const res = await esClient.search<{ 'kibana.alert.workflow_tags': string[] }>({
          index,
          query: buildEsQuery(undefined, { query, language: 'kuery' }, []),
        });

        for (const hit of res.hits.hits) {
          const tags = hit._source?.['kibana.alert.workflow_tags'] ?? [];
          expect(tags).to.contain(user.username);
        }
      });
    });

    usersThatShouldNotUpdateTheTags.forEach((user) => {
      it(`${user.username} should bulk update alert tags by query in ${spaceId}/${index}`, async () => {
        await bulkUpdateAlertTags({
          supertest: supertestWithoutAuth,
          spaceId,
          query,
          index,
          add: ['should-not-update'],
          user,
          expectedStatusCode: 207,
        });

        const res = await esClient.search<{ 'kibana.alert.workflow_tags': string[] }>({
          index,
          query: buildEsQuery(undefined, { query, language: 'kuery' }, []),
        });

        for (const hit of res.hits.hits) {
          const tags = hit._source?.['kibana.alert.workflow_tags'] ?? [];
          expect(tags).to.not.contain('should-not-update');
        }
      });
    });

    unauthorizedUsers.forEach((user) => {
      it(`${user.username} should NOT bulk update alert tags by query in ${spaceId}/${index}`, async () => {
        await bulkUpdateAlertTags({
          supertest: supertestWithoutAuth,
          spaceId,
          query,
          index,
          add: [user.username],
          user,
          expectedStatusCode: 403,
        });
      });
    });
  };

  describe('Bulk update tags', () => {
    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/rule_registry/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/rule_registry/alerts');
    });

    describe('validation', () => {
      it('should return 400 with no alertIds and queries', async () => {
        await bulkUpdateAlertTags({
          supertest,
          index: 'foo',
          add: ['tag1'],
          user: superUser,
          expectedStatusCode: 400,
        });
      });

      it('should return 400 when requesting more than 1K alerts', async () => {
        await bulkUpdateAlertTags({
          supertest,
          alertIds: Array.from({ length: 1001 }, (_, i) => `alert-id-${i}`),
          index: 'foo',
          add: ['tag1'],
          user: superUser,
          expectedStatusCode: 400,
        });
      });

      it('should return 400 when requesting both alertIds and query', async () => {
        await bulkUpdateAlertTags({
          supertest,
          alertIds: ['alert-id-1'],
          query: 'some-query',
          index: 'foo',
          add: ['tag1'],
          user: superUser,
          expectedStatusCode: 400,
        });
      });

      it('should return 400 when requesting emtpy alertIds', async () => {
        await bulkUpdateAlertTags({
          supertest,
          alertIds: [],
          index: 'foo',
          add: ['tag1'],
          user: superUser,
          expectedStatusCode: 400,
        });
      });

      it('should return 400 when requesting emtpy query', async () => {
        await bulkUpdateAlertTags({
          supertest,
          query: '',
          index: 'foo',
          add: ['tag1'],
          user: superUser,
          expectedStatusCode: 400,
        });
      });

      it('should return 400 when requesting with no operation', async () => {
        await bulkUpdateAlertTags({
          supertest,
          alertIds: ['alert-id-1'],
          index: 'foo',
          user: superUser,
          expectedStatusCode: 400,
        });
      });

      it('should return 400 when requesting with empty add', async () => {
        await bulkUpdateAlertTags({
          supertest,
          alertIds: ['alert-id-1'],
          index: 'foo',
          add: [],
          user: superUser,
          expectedStatusCode: 400,
        });
      });

      it('should return 400 when requesting with empty remove', async () => {
        await bulkUpdateAlertTags({
          supertest,
          alertIds: ['alert-id-1'],
          index: 'foo',
          remove: [],
          user: superUser,
          expectedStatusCode: 400,
        });
      });
    });

    describe('update', () => {
      describe('with alertIds', () => {
        it('should update the alert tags correctly', async () => {
          await bulkUpdateAlertTags({
            supertest,
            alertIds: ['alert-without-workflow-tags', 'alert-with-workflow-tags'],
            index: '.alerts-*',
            add: ['tag-1', 'tag-3'],
            remove: ['tag-2', 'tag-4'],
            user: superUser,
            expectedStatusCode: 207,
          });

          const alertDocs = await bulkGetDocs({
            docs: [
              { _id: 'alert-without-workflow-tags', _index: '.alerts-observability.apm.alerts' },
              { _id: 'alert-with-workflow-tags', _index: '.alerts-observability.apm.alerts' },
            ],
            esClient,
          });

          expect(alertDocs.docs.length).to.eql(2);

          for (const doc of alertDocs.docs) {
            expect(getTagsFromDoc(doc)).to.eql(['tag-1', 'tag-3']);
          }
        });
      });

      describe('with query', () => {
        it('should update the alert tags correctly with KQL', async () => {
          await bulkUpdateAlertTags({
            supertest,
            query: 'kibana.alert.workflow_tags : "tag-2" OR kibana.alert.workflow_tags : "tag-4"',
            index: '.alerts-*',
            add: ['tag-1', 'tag-3'],
            remove: ['tag-2', 'tag-4'],
            user: superUser,
            expectedStatusCode: 207,
          });

          const alertDocs = await bulkGetDocs({
            docs: [{ _id: 'alert-with-workflow-tags', _index: '.alerts-observability.apm.alerts' }],
            esClient,
          });

          expect(alertDocs.docs.length).to.eql(1);

          for (const doc of alertDocs.docs) {
            expect(getTagsFromDoc(doc)).to.eql(['tag-1', 'tag-3']);
          }
        });
      });
    });

    describe('RBAC', () => {
      describe('Security Solution', () => {
        /**
         * Security Solution allows users with read privileges to update alerts.
         */
        const authorizedInAllSpaces = [superUser, secOnlySpacesAll, obsSecSpacesAll, globalRead];
        const authorizedOnlyInSpace1 = [secOnly, obsSec, secOnlyRead, obsSecRead];

        const authorizedOnlyInSpace2 = [
          secOnlySpace2,
          obsSecAllSpace2,
          secOnlyReadSpace2,
          obsSecReadSpace2,
        ];

        const unauthorized = [obsOnlyRead, obsOnlyReadSpace2, noKibanaPrivileges];

        describe('with alert ids', () => {
          addAlertIdsTests({
            spaceId: 'space1',
            alertIds: ['020202'],
            index: '.alerts-security*',
            authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace1],
            unauthorizedUsers: [...authorizedOnlyInSpace2, ...unauthorized],
          });

          addAlertIdsTests({
            spaceId: 'space2',
            alertIds: ['020202'],
            index: '.alerts-security*',
            authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace2],
            unauthorizedUsers: [...authorizedOnlyInSpace1, ...unauthorized],
          });
        });

        describe('with queries', () => {
          addQueryTests({
            spaceId: 'space1',
            query: 'kibana.alert.workflow_tags: siem-tag-1',
            index: '.alerts-security*',
            authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace1],
            unauthorizedUsers: [...authorizedOnlyInSpace2, ...unauthorized],
            usersThatShouldNotUpdateTheTags: [obsOnly, obsOnlySpacesAll],
          });

          addQueryTests({
            spaceId: 'space2',
            query: 'kibana.alert.workflow_tags: siem-tag-1',
            index: '.alerts-security*',
            authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace2],
            unauthorizedUsers: [...authorizedOnlyInSpace1, ...unauthorized],
            usersThatShouldNotUpdateTheTags: [obsOnlySpace2, obsOnlySpacesAll],
          });
        });
      });

      describe('APM', () => {
        const authorizedInAllSpaces = [superUser, obsOnlySpacesAll, obsSecSpacesAll];
        const authorizedOnlyInSpace1 = [obsOnly, obsSec];
        const authorizedOnlyInSpace2 = [obsOnlySpace2, obsSecAllSpace2];

        const unauthorizedForAlertIds = [
          globalRead,
          obsOnlyRead,
          obsSecRead,
          obsOnlyReadSpace2,
          obsSecReadSpace2,
          secOnly,
          secOnlyRead,
          secOnlySpace2,
          secOnlyReadSpace2,
          secOnlySpacesAll,
          noKibanaPrivileges,
        ];

        const unauthorizedForQuery = [obsOnlyRead, obsOnlyReadSpace2, noKibanaPrivileges];

        describe('with alert ids', () => {
          addAlertIdsTests({
            spaceId: 'space1',
            alertIds: ['NoxgpHkBqbdrfX07MqXV'],
            index: '.alerts-observability*',
            authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace1],
            unauthorizedUsers: [...authorizedOnlyInSpace2, ...unauthorizedForAlertIds],
          });

          addAlertIdsTests({
            spaceId: 'space2',
            alertIds: ['NoxgpHkBqbdrfX07MqXV'],
            index: '.alerts-observability*',
            authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace2],
            unauthorizedUsers: [...authorizedOnlyInSpace1, ...unauthorizedForAlertIds],
          });
        });

        describe('with queries', () => {
          addQueryTests({
            spaceId: 'space1',
            query: 'kibana.alert.workflow_tags: apm-tag-1',
            index: '.alerts-observability*',
            authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace1],
            unauthorizedUsers: [...authorizedOnlyInSpace2, ...unauthorizedForQuery],
            usersThatShouldNotUpdateTheTags: [
              globalRead,
              obsSecRead,
              secOnly,
              secOnlyRead,
              secOnlySpacesAll,
            ],
          });

          addQueryTests({
            spaceId: 'space2',
            query: 'kibana.alert.workflow_tags: apm-tag-1',
            index: '.alerts-observability*',
            authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace2],
            unauthorizedUsers: [...authorizedOnlyInSpace1, ...unauthorizedForQuery],
            usersThatShouldNotUpdateTheTags: [
              globalRead,
              obsSecReadSpace2,
              secOnlySpace2,
              secOnlyReadSpace2,
              secOnlySpacesAll,
            ],
          });
        });
      });
    });
  });
};

const getTagsFromDoc = (doc?: any): string[] => {
  return doc?._source?.['kibana.alert.workflow_tags'] ?? [];
};
