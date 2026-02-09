/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  let roleAuthc: RoleCredentials;

  describe('find', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('with kibana index - basic', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.importExport.load(
          'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        );
      });
      after(async () => {
        await kibanaServer.importExport.unload(
          'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        );
      });
      it('should return 200 with individual responses', async () => {
        const { body } = await supertestWithoutAuth
          .get('/api/kibana/management/saved_objects/_find?type=visualization')
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);
        expect(body.saved_objects.map((so: { id: string }) => so.id)).to.eql([
          'dd7caf20-9efd-11e7-acb3-3dab96693fab',
        ]);
      });

      describe('unknown type', () => {
        it('should return 200 with empty response', async () => {
          const { body } = await supertestWithoutAuth
            .get('/api/kibana/management/saved_objects/_find?type=wigwags')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          expect(body).to.eql({
            page: 1,
            per_page: 20,
            total: 0,
            saved_objects: [],
          });
        });
      });

      describe('page beyond total', () => {
        it('should return 200 with empty response', async () => {
          const { body } = await supertestWithoutAuth
            .get(
              '/api/kibana/management/saved_objects/_find?type=visualization&page=100&perPage=100'
            )
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);

          expect(body).to.eql({
            page: 100,
            per_page: 100,
            total: 1,
            saved_objects: [],
          });
        });
      });

      describe('unknown search field', () => {
        it('should return 400 when using searchFields', async () => {
          const { body } = await supertestWithoutAuth
            .get('/api/kibana/management/saved_objects/_find?type=url&searchFields=a')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(400);
          expect(body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: '[request query.searchFields]: definition for this key is missing',
          });
        });
      });
    });

    describe('with kibana index - relationships', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.importExport.load(
          'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        );
        await kibanaServer.importExport.load(
          'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/references.json'
        );
      });
      after(async () => {
        await kibanaServer.importExport.unload(
          'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/references.json'
        );
        await kibanaServer.importExport.unload(
          'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        );
      });
      describe('`hasReference` and `hasReferenceOperator` parameters', () => {
        it('search for a reference', async () => {
          const { body } = await supertestWithoutAuth
            .get('/api/kibana/management/saved_objects/_find')
            .query({
              type: 'visualization',
              hasReference: JSON.stringify({ type: 'ref-type', id: 'ref-1' }),
            })
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          const objects = body.saved_objects;
          expect(objects.map((obj: any) => obj.id).sort()).to.eql([
            'only-ref-1',
            'ref-1-and-ref-2',
          ]);
        });
      });

      it('search for multiple references with OR operator', async () => {
        const response = await supertestWithoutAuth
          .get('/api/kibana/management/saved_objects/_find')
          .query({
            type: 'visualization',
            hasReference: JSON.stringify([
              { type: 'ref-type', id: 'ref-1' },
              { type: 'ref-type', id: 'ref-2' },
            ]),
            hasReferenceOperator: 'OR',
          })
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader);
        expect(response.status).to.eql(200);
        expect(response.body.saved_objects.length).not.to.be(null);
        expect(response.body.saved_objects.map((obj: any) => obj.id).length).to.be.greaterThan(0);
      });

      it('search for multiple references with AND operator', async () => {
        const { body } = await supertestWithoutAuth
          .get('/api/kibana/management/saved_objects/_find')
          .query({
            type: 'visualization',
            hasReference: JSON.stringify([
              { type: 'ref-type', id: 'ref-1' },
              { type: 'ref-type', id: 'ref-2' },
            ]),
            hasReferenceOperator: 'AND',
          })
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);
        const objects = body.saved_objects;
        expect(objects.map((obj: any) => obj.id)).to.eql(['ref-1-and-ref-2']);
      });

      describe('`sortField` and `sortOrder` parameters', () => {
        it('sort objects by "type" in "asc" order', async () => {
          const { body } = await supertestWithoutAuth
            .get('/api/kibana/management/saved_objects/_find')
            .query({
              type: ['visualization', 'dashboard'],
              sortField: 'type',
              sortOrder: 'asc',
            })
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);

          const objects = body.saved_objects;
          expect(objects.length).be.greaterThan(1); // Need more than 1 result for our test
          expect(objects[0].type).to.be('dashboard');
        });
        // does not work in serverless mode
        it('sort objects by "type" in "desc" order', async () => {
          const { body } = await supertestWithoutAuth
            .get('/api/kibana/management/saved_objects/_find')
            .query({
              type: ['visualization', 'dashboard'],
              sortField: 'type',
              sortOrder: 'desc',
            })
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);

          const objects = body.saved_objects;
          expect(objects[0].type).to.be('visualization');
        });
      });
    });

    describe('meta attributes injected properly', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.importExport.load(
          'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/search.json'
        );
      });
      after(async () => {
        await kibanaServer.importExport.unload(
          'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/search.json'
        );
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('should inject meta attributes for searches', async () => {
        const response = await supertestWithoutAuth
          .get('/api/kibana/management/saved_objects/_find?type=search')
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);
        expect(response.body.saved_objects).to.have.length(1);
        expect(response.body.saved_objects[0].meta).to.eql({
          icon: 'discoverApp',
          title: 'OneRecord',
          hiddenType: false,
          inAppUrl: {
            path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
            uiCapabilitiesPath: 'discover_v2.show',
          },
          namespaceType: 'multiple-isolated',
        });
      });

      it('should inject meta attributes for dashboards', async () => {
        const response = await supertestWithoutAuth
          .get('/api/kibana/management/saved_objects/_find?type=dashboard')
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);
        expect(response.body.saved_objects).to.have.length(1);
        expect(response.body.saved_objects[0].meta).to.eql({
          icon: 'dashboardApp',
          title: 'Dashboard',
          hiddenType: false,
          inAppUrl: {
            path: '/app/dashboards#/view/b70c7ae0-3224-11e8-a572-ffca06da1357',
            uiCapabilitiesPath: 'dashboard_v2.show',
          },
          namespaceType: 'multiple-isolated',
        });
      });

      it('should inject meta attributes for visualizations', async () => {
        const response = await supertestWithoutAuth
          .get('/api/kibana/management/saved_objects/_find?type=visualization')
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);
        expect(response.body.saved_objects).to.have.length(2);
        expect(response.body.saved_objects[0].meta).to.eql({
          icon: 'visualizeApp',
          title: 'VisualizationFromSavedSearch',
          namespaceType: 'multiple-isolated',
          hiddenType: false,
        });
        expect(response.body.saved_objects[1].meta).to.eql({
          icon: 'visualizeApp',
          title: 'Visualization',
          namespaceType: 'multiple-isolated',
          hiddenType: false,
        });
      });

      it('should inject meta attributes for index patterns', async () => {
        const response = await supertestWithoutAuth
          .get('/api/kibana/management/saved_objects/_find?type=index-pattern')
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);
        expect(response.body.saved_objects).to.have.length(1);
        expect(response.body.saved_objects[0].meta).to.eql({
          icon: 'indexPatternApp',
          title: 'saved_objects*',
          hiddenType: false,
          editUrl: '/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
          inAppUrl: {
            path: '/app/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
            uiCapabilitiesPath: 'management.kibana.indexPatterns',
          },
          namespaceType: 'multiple',
        });
      });
    });
  });
}
