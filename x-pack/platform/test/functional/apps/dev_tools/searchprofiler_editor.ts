/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import type { FtrProviderContext } from '../../ftr_provider_context';

const testIndex = 'test-index';
const testQuery = {
  query: {
    match_all: {},
  },
};
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'searchProfiler']);
  const retry = getService('retry');
  const security = getService('security');
  const es = getService('es');
  const log = getService('log');

  describe('Search Profiler Editor', () => {
    before(async () => {
      await security.testUser.setRoles(['global_devtools_read']);
      await PageObjects.common.navigateToApp('searchProfiler');
      await es.indices.create({ index: testIndex });
      await es.index({
        index: testIndex,
        id: '1',
        body: {
          test: 'sample value',
        },
      });

      expect(await PageObjects.searchProfiler.editorExists()).to.be(true);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      if (await es.indices.exists({ index: testIndex })) {
        try {
          await es.indices.delete({ index: testIndex });
        } catch (error) {
          log.error(`Error deleting index ${testIndex}: ${error}`);
        }
      }
    });

    it('supports pre-configured search query', async () => {
      const query = {
        query: {
          bool: {
            should: [
              {
                match: {
                  name: 'fred',
                },
              },
              {
                terms: {
                  name: ['sue', 'sally'],
                },
              },
            ],
          },
        },
        aggs: {
          stats: {
            stats: {
              field: 'price',
            },
          },
        },
      };

      // Since we're not actually running the query in the test,
      // this index name is just an input placeholder and does not exist
      const indexName = 'my_index';

      await PageObjects.common.navigateToUrl(
        'searchProfiler',
        PageObjects.searchProfiler.getUrlWithIndexAndQuery({ indexName, query }),
        {
          useActualUrl: true,
        }
      );

      const indexInputValue = await PageObjects.searchProfiler.getIndexName();

      expect(indexInputValue).to.eql(indexName);

      await retry.try(async () => {
        const searchProfilerInput = await PageObjects.searchProfiler.getQuery();
        expect(searchProfilerInput).to.eql(query);
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/241358
    describe.skip('With a test index', () => {
      it('profiles a simple query', async () => {
        await PageObjects.searchProfiler.setIndexName(testIndex);
        await PageObjects.searchProfiler.setQuery(testQuery);

        await PageObjects.searchProfiler.clickProfileButton();

        const content = await PageObjects.searchProfiler.getProfileContent();
        expect(content).to.contain(testIndex);
      });
    });

    describe('triple quotes in JSON parsing', () => {
      const testCases = [
        {
          shouldHaveErrors: false,
          input: `{ "query": { "match_all": {} } }`,
          description: 'valid JSON without triple quotes',
        },
        {
          shouldHaveErrors: false,
          input: `{ "query": { "match": { "test": """{"more": "json"}""" } } }`,
          description: 'valid JSON with triple quotes',
        },
        {
          shouldHaveErrors: true,
          input: `{"query": {"match": {"test": """{ "more": "json" }"" } } }`,
          description: 'invalid JSON with mismatched triple quotes',
        },
        {
          shouldHaveErrors: true,
          input: `{"query": {"match": {"test": """{ "more": "json" }""' } } }`,
          description: 'invalid JSON with mixed quote types',
        },
      ];

      testCases.forEach(({ shouldHaveErrors, input, description }) => {
        it(`${
          shouldHaveErrors ? 'should show error toast' : 'should not show error toast'
        } for ${description}`, async () => {
          await PageObjects.searchProfiler.setStringQuery(input);
          await PageObjects.searchProfiler.clickProfileButton();

          await retry.waitFor(
            `parser errors to match expectation: ${
              shouldHaveErrors ? 'HAS ERROR TOAST' : 'NO ERROR TOAST'
            }`,
            async () => {
              const actual = await PageObjects.searchProfiler.editorHasJsonParseErrorNotification();
              return shouldHaveErrors === actual;
            }
          );
        });
      });
    });

    describe('No indices', () => {
      before(async () => {
        // Delete any existing indices that were not properly cleaned up
        try {
          const indices = await es.indices.get({
            index: '*',
          });
          const indexNames = Object.keys(indices);

          if (indexNames.length > 0) {
            await asyncForEach(indexNames, async (indexName) => {
              await es.indices.delete({ index: indexName });
            });
          }
        } catch (e) {
          log.debug('[Setup error] Error deleting existing indices');
          throw e;
        }
      });

      it('returns error if profile is executed with no valid indices', async () => {
        await PageObjects.searchProfiler.setIndexName('_all');
        await PageObjects.searchProfiler.setQuery(testQuery);

        await PageObjects.searchProfiler.clickProfileButton();

        await retry.waitFor('notification renders', async () => {
          return await PageObjects.searchProfiler.editorHasErrorNotification();
        });
      });
    });
  });
}
