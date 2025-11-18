/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type TestAgent from 'supertest/lib/agent';
import equal from 'fast-deep-equal';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'savedObjects']);
  const server = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const apiUrl = '/api/kibana/management/saved_objects/scroll/counts';
  const svlCommonApi = getService('svlCommonApi');
  const testSubjects = getService('testSubjects');
  let headers: Record<string, string>;

  describe('scroll_count', () => {
    describe('saved objects with hidden type', () => {
      before(async () => {
        await esArchiver.load(
          'src/platform/test/functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
        );
        await kibanaServer.importExport.load(
          'x-pack/platform/test/functional/fixtures/kbn_archives/saved_objects_management/hidden_saved_objects'
        );
        await pageObjects.svlCommonPage.loginAsAdmin();
        await pageObjects.common.navigateToApp('management');
        await testSubjects.click('app-card-objects');
        await pageObjects.savedObjects.waitTableIsLoaded();
        headers = {
          ...svlCommonApi.getCommonRequestHeader(),
          ...svlCommonApi.getInternalRequestHeader(),
        };
      });
      after(async () => {
        await esArchiver.unload(
          'src/platform/test/functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
        );
        await kibanaServer.savedObjects.clean({
          types: ['test-hidden-importable-exportable'],
        });
      });

      it('only counts hidden types that are importableAndExportable', async () => {
        const { body: actualCount } = await server
          .post(apiUrl)
          .set(headers)
          .send({
            typesToInclude: [
              'test-hidden-non-importable-exportable',
              'test-hidden-importable-exportable',
            ],
          })
          .expect(200);

        await expectCountMatches({
          expectedCount: {
            'test-hidden-importable-exportable': 1,
            'test-hidden-non-importable-exportable': 0,
          },
          actualCount,
          server,
          headers,
        });
      });
    });
  });
}

interface ExpectCountMatchesParams {
  expectedCount: Record<string, number>;
  actualCount: Record<string, number>;
  server: TestAgent;
  headers: Record<string, string>;
}

async function expectCountMatches({
  expectedCount,
  actualCount,
  server,
  headers,
}: ExpectCountMatchesParams) {
  if (!equal(actualCount, expectedCount)) {
    const mismatchingTypes = Object.keys(expectedCount).filter(
      (key) => expectedCount[key] !== actualCount[key]
    );
    const { body: savedObjects } = await server
      .get(`/api/kibana/management/saved_objects/_find?type=${mismatchingTypes}&perPage=100`)
      .set(headers)
      .send();

    const msg = `The counts for the following object types do not match:

      ${mismatchingTypes
        .map((type) => `- ${type}. Expected: ${expectedCount[type]}; Found: ${actualCount[type]}`)
        .join('\n')}

    Objects on SO index:

${JSON.stringify(savedObjects, null, 2)}`;

    throw new Error(msg);
  }
}
