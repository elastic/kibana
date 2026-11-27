/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type request from 'supertest';

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import type { JobParamsCsvFromSavedObject } from '@kbn/reporting-export-types-csv-common';
import type { ReportApiJSON } from '@kbn/reporting-common/types';
import rison from '@kbn/rison';
import type { FtrProviderContext } from '../../ftr_provider_context';

const LOGSTASH_DATA_ARCHIVE =
  'src/platform/test/functional/fixtures/es_archiver/logstash_functional';
const LOGSTASH_SAVED_OBJECTS =
  'x-pack/platform/test/functional/fixtures/kbn_archives/reporting/logs';
const ECOM_SAVED_SEARCH_ID = '6091ead0-1c6d-11ea-a100-8589bb9d7c6b';
const ECOM_DATA_VIEW_ID = '5193f870-d861-11e9-a311-0fa548c5f953';
const TIMELESS_SAVED_OBJECTS =
  'x-pack/platform/test/functional/fixtures/kbn_archives/reporting/timeless';
const TIMELESS_SAVED_SEARCH_WITH_QUERY = 'fc3e8ff0-9844-11ed-8e25-6b737289a7c8';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('reportingAPI');
  const log = getService('log');

  const requestCsvFromSavedSearch = async (
    params: Omit<JobParamsCsvFromSavedObject, 'objectType' | 'browserTimezone' | 'version'>
  ) => {
    const job: JobParamsCsvFromSavedObject = {
      browserTimezone: (params as JobParamsCsvFromSavedObject).browserTimezone ?? 'UTC',
      objectType: 'search',
      version: '8.7.0',
      ...params,
    };
    log.info(`sending request for saved search: ${job.locatorParams[0].params.savedSearchId}`);
    const jobParams = rison.encode(job);
    return await supertest
      .post(`/api/reporting/generate/csv_v2`)
      .set('kbn-xsrf', 'xxx')
      .send({ jobParams });
  };

  const cleanupLogstash = async () => {
    const logstashIndices = await es.indices.get({
      index: 'logstash-*',
      allow_no_indices: true,
      expand_wildcards: 'all',
      ignore_unavailable: true,
    });
    await Promise.all(
      Object.keys(logstashIndices.body ?? {}).map(async (logstashIndex) => {
        log.info(`deleting ${logstashIndex}`);
        await es.indices.delete({
          index: logstashIndex,
        });
      })
    );
  };

  const timelessIndexName = 'timeless-test';
  const loadTimelessData = async () => {
    log.info(`loading test data`);
    await es.indices.create({
      index: timelessIndexName,
      settings: { number_of_shards: 1 },
      mappings: {
        properties: {
          eon: { type: 'keyword' },
          era: { type: 'keyword' },
          period: { type: 'keyword' },
          epoch: { type: 'keyword' },
        },
      },
    });
    await es.bulk({
      refresh: 'wait_for',
      operations: [
        { index: { _index: timelessIndexName, _id: 'tvJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Neogene', epoch: ' Pliocene' },
        { index: { _index: timelessIndexName, _id: 't_JJX4UBvD7uFsw9L2x4' } },
        { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Quaternary', epoch: ' Holocene' },
        { index: { _index: timelessIndexName, _id: 'uPJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Cretaceous' },
        { index: { _index: timelessIndexName, _id: 'ufJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Jurassic' },
        { index: { _index: timelessIndexName, _id: 'uvJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Cambrian' },
        { index: { _index: timelessIndexName, _id: 'u_JJX4UBvD7uFsw9L2x4' } },
        { eon: 'Proterozoic', era: 'Paleozoic', period: 'Permian' },
        { index: { _index: timelessIndexName, _id: 'vPJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Archean' },
        { index: { _index: timelessIndexName, _id: 'vfJJX4UBvD7uFsw9L2x4' } },
        { eon: 'Hadean' },
      ],
    });
  };

  describe('CSV Generation from Saved Search ID', () => {
    before(async () => {
      // clear any previous UI Settings
      await kibanaServer.uiSettings.replace({});

      // explicitly delete all pre-existing logstash indices, since we have exports with no time filter
      log.info(`deleting logstash indices`);
      await cleanupLogstash();

      log.info(`updating Advanced Settings`);
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': false,
        'dateFormat:tz': 'UTC',
        dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
      });
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({});
    });

    describe('export from non-timebased data view', () => {
      before(async () => {
        await kibanaServer.importExport.load(TIMELESS_SAVED_OBJECTS);
        await loadTimelessData();
      });

      after(async () => {
        await kibanaServer.importExport.unload(TIMELESS_SAVED_OBJECTS);

        log.info(`loading test data`);
        await es.indices.delete({
          index: timelessIndexName,
        });
      });

      describe('query stored in the saved search', () => {
        let response: request.Response;
        let job: ReportApiJSON;
        let path: string;
        let csvFile: string;

        before(async () => {
          const { text, status } = await requestCsvFromSavedSearch({
            locatorParams: [
              {
                id: DISCOVER_APP_LOCATOR,
                version: 'reporting',
                params: {
                  savedSearchId: TIMELESS_SAVED_SEARCH_WITH_QUERY,
                },
              },
            ],
          });
          expect(status).to.eql(200);
          ({ job, path } = JSON.parse(text));
          await reportingAPI.waitForJobToFinish(path);
          response = await supertest.get(path);
          csvFile = response.text;
        });

        it('job response data is correct', () => {
          expect(path).to.be.a('string');
          expect(job).to.be.an('object');
          expect(job.attempts).equal(0);
          expectSnapshot({
            contentType: response.header['content-type'],
            contentDisposition: response.header['content-disposition'],
            title: job.payload.title,
          }).toMatch();
        });

        it('csv file matches', () => {
          expectSnapshot(csvFile).toMatch();
        });
      });
    });

    describe('export from timebased data view', () => {
      before(async () => {
        log.info(`loading archives and fixtures`);
        await esArchiver.load(LOGSTASH_DATA_ARCHIVE);
        await kibanaServer.importExport.load(LOGSTASH_SAVED_OBJECTS);
      });

      after(async () => {
        await esArchiver.unload(LOGSTASH_DATA_ARCHIVE);
        await kibanaServer.importExport.unload(LOGSTASH_SAVED_OBJECTS);
      });

      describe('timezone formatting', () => {
        const savedSearchId = ECOM_SAVED_SEARCH_ID;
        const timeRange = { from: '2019-07-11T00:00:00.000Z', to: '2019-07-12T00:00:00.000Z' };

        describe('export with custom timezone and timeRange from locator params', () => {
          let response: request.Response;
          let job: ReportApiJSON;
          let path: string;
          let csvFile: string;

          before(async () => {
            await reportingAPI.initEcommerce();
            const { text, status } = await requestCsvFromSavedSearch({
              locatorParams: [
                {
                  id: DISCOVER_APP_LOCATOR,
                  version: 'reporting',
                  params: { savedSearchId, timeRange },
                },
              ],
              browserTimezone: 'US/Alaska',
              objectType: 'search',
              version: 'reporting',
            } as JobParamsCsvFromSavedObject);
            expect(status).to.eql(200);
            ({ job, path } = JSON.parse(text));
            await reportingAPI.waitForJobToFinish(path);
            response = await supertest.get(path);
            csvFile = response.text;
          });

          after(async () => {
            await reportingAPI.teardownEcommerce();
          });

          it('job response data is correct', () => {
            expect(path).to.be.a('string');
            expect(job).to.be.an('object');
            expect(job.attempts).equal(0);
            expectSnapshot({
              contentType: response.header['content-type'],
              contentDisposition: response.header['content-disposition'],
              title: job.payload.title,
            }).toMatch();
          });

          it('csv file matches', () => {
            expectSnapshot(csvFile).toMatch();
          });
        });
      });

      describe('locator params without a saved search, or on top of one', () => {
        const timeRange = { from: '2019-07-11T00:00:00.000Z', to: '2019-07-12T00:00:00.000Z' };

        before(async () => {
          await reportingAPI.initEcommerce();
        });

        after(async () => {
          await reportingAPI.teardownEcommerce();
        });

        const generateCsv = async (
          params: JobParamsCsvFromSavedObject['locatorParams'][number]['params'],
          jobParams: Pick<JobParamsCsvFromSavedObject, 'forceNow'> = {}
        ) => {
          const { text, status } = await requestCsvFromSavedSearch({
            locatorParams: [{ id: DISCOVER_APP_LOCATOR, version: 'reporting', params }],
            ...jobParams,
          });
          expect(status).to.eql(200);
          const { job, path }: { job: ReportApiJSON; path: string } = JSON.parse(text);
          await reportingAPI.waitForJobToFinish(path);
          const response = await supertest.get(path);
          return { job, path, response, csvFile: response.text };
        };

        describe('data view id only (unsaved search)', () => {
          let result: Awaited<ReturnType<typeof generateCsv>>;

          before(async () => {
            result = await generateCsv({
              dataViewId: ECOM_DATA_VIEW_ID,
              columns: ['category', 'currency', 'order_id'],
              sort: [
                ['order_date', 'asc'],
                ['order_id', 'asc'],
              ],
              query: { language: 'kuery', query: 'currency:EUR' },
              timeRange,
            });
          });

          it('job response data is correct, with the data view name as title', () => {
            expect(result.job.attempts).equal(0);
            expectSnapshot({
              contentType: result.response.header['content-type'],
              contentDisposition: result.response.header['content-disposition'],
              title: result.job.payload.title,
            }).toMatch();
          });

          it('has the time field before the columns, and the rows sorted', () => {
            const [header, ...rows] = result.csvFile.trim().split('\n');
            expect(header).to.eql('order_date,category,currency,order_id');
            expect(rows.length).to.be.greaterThan(1);

            const dates = rows.map((row) => row.split(',')[0]);
            expect(dates).to.eql([...dates].sort());
          });

          it('only has the rows that match the query', () => {
            const [, ...rows] = result.csvFile.trim().split('\n');
            expect(rows.every((row) => row.includes(',EUR,'))).to.be(true);
          });

          it('csv file matches', () => {
            expectSnapshot(result.csvFile).toMatch();
          });
        });

        describe('columns and sort of the locator params, over the ones of the saved search', () => {
          let result: Awaited<ReturnType<typeof generateCsv>>;

          before(async () => {
            result = await generateCsv({
              savedSearchId: ECOM_SAVED_SEARCH_ID,
              columns: ['category', 'order_id'],
              sort: [['order_id', 'asc']],
              timeRange,
            });
          });

          it('uses the columns of the locator params, with the time field first', () => {
            const [header] = result.csvFile.trim().split('\n');
            expect(header).to.eql('order_date,category,order_id');
          });

          it('uses the sort of the locator params', () => {
            const [, ...rows] = result.csvFile.trim().split('\n');
            const orderIds = rows.map((row) => Number(row.split(',').pop()));
            expect(orderIds).to.eql([...orderIds].sort((a, b) => a - b));
          });

          it('csv file matches', () => {
            expectSnapshot(result.csvFile).toMatch();
          });
        });

        describe('relative time range, as in a scheduled report', () => {
          const params = {
            dataViewId: ECOM_DATA_VIEW_ID,
            columns: ['category', 'order_id'],
            sort: [
              ['order_date', 'asc'],
              ['order_id', 'asc'],
            ],
            filters: [],
          };
          const getRows = (csvFile: string) => csvFile.trim().split('\n').slice(1);

          it('is anchored to forceNow, so it exports the rows of the equivalent absolute time range', async () => {
            const absolute = await generateCsv({ ...params, timeRange });
            // the scheduled report resolves "now" to the time it runs at, which is the end of the absolute range
            const relative = await generateCsv(
              { ...params, timeRange: { from: 'now-1d', to: 'now' } },
              { forceNow: timeRange.to }
            );

            expect(getRows(absolute.csvFile).length).to.be.greaterThan(1);
            expect(relative.csvFile).to.eql(absolute.csvFile);
          });

          it('is not anchored to the current time without forceNow', async () => {
            // the data is from 2019, so the last day before now does not have rows
            const { csvFile } = await generateCsv({
              ...params,
              timeRange: { from: 'now-1d', to: 'now' },
            });

            expect(getRows(csvFile)).to.eql([]);
          });
        });

        describe('filters of the locator params, over the ones of the saved search', () => {
          const savedSearchWithFilterId = 'csv-v2-saved-search-with-filter';
          const genderFilter = (gender: 'MALE' | 'FEMALE') => ({
            meta: {
              alias: null,
              disabled: false,
              negate: false,
              key: 'customer_gender',
              params: { query: gender },
              type: 'phrase',
              index: ECOM_DATA_VIEW_ID,
            },
            query: { match_phrase: { customer_gender: gender } },
          });

          const getGenders = (csvFile: string) => {
            const [header, ...rows] = csvFile.trim().split('\n');
            const genderIndex = header.split(',').indexOf('customer_gender');
            return new Set(rows.map((row) => row.split(',')[genderIndex]));
          };

          before(async () => {
            await kibanaServer.savedObjects.create({
              type: 'search',
              id: savedSearchWithFilterId,
              overwrite: true,
              attributes: {
                title: 'Ecommerce with a filter',
                description: '',
                tabs: [
                  {
                    id: 'tab-1',
                    label: 'Untitled',
                    attributes: {
                      columns: ['customer_gender', 'order_id'],
                      sort: [['order_id', 'asc']],
                      kibanaSavedObjectMeta: {
                        searchSourceJSON: JSON.stringify({
                          query: { query: '', language: 'kuery' },
                          filter: [
                            {
                              ...genderFilter('MALE'),
                              meta: {
                                ...genderFilter('MALE').meta,
                                index: undefined,
                                indexRefName:
                                  'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
                              },
                            },
                          ],
                          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                        }),
                      },
                    },
                  },
                ],
              },
              references: [
                {
                  id: ECOM_DATA_VIEW_ID,
                  name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                  type: 'index-pattern',
                },
                {
                  id: ECOM_DATA_VIEW_ID,
                  name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
                  type: 'index-pattern',
                },
              ],
            });
          });

          after(async () => {
            await kibanaServer.savedObjects.delete({
              type: 'search',
              id: savedSearchWithFilterId,
            });
          });

          it('uses the filters of the saved search if the locator params do not have filters', async () => {
            const { csvFile } = await generateCsv({
              savedSearchId: savedSearchWithFilterId,
              timeRange,
            });

            expect(getGenders(csvFile)).to.eql(new Set(['MALE']));
          });

          it('adds the filters of the locator params to the ones of the saved search, if there is no data view', async () => {
            const { csvFile } = await generateCsv({
              savedSearchId: savedSearchWithFilterId,
              filters: [genderFilter('FEMALE')],
              timeRange,
            });

            // the saved filter is still applied, so there are no rows that match both genders
            expect(getGenders(csvFile)).to.eql(new Set());
          });

          it('does not use the filters of the saved search if they were removed, with a data view in the locator params', async () => {
            const { csvFile } = await generateCsv({
              savedSearchId: savedSearchWithFilterId,
              dataViewId: ECOM_DATA_VIEW_ID,
              filters: [],
              timeRange,
            });

            expect(getGenders(csvFile)).to.eql(new Set(['MALE', 'FEMALE']));
          });

          it('uses the filters of the locator params instead of the ones of the saved search, with a data view in the locator params', async () => {
            const { csvFile } = await generateCsv({
              savedSearchId: savedSearchWithFilterId,
              dataViewId: ECOM_DATA_VIEW_ID,
              filters: [genderFilter('FEMALE')],
              timeRange,
            });

            expect(getGenders(csvFile)).to.eql(new Set(['FEMALE']));
          });
        });
      });
    });
  });
};
