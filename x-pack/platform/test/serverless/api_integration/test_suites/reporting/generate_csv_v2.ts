/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JobParamsCsvV2 } from '@kbn/reporting-export-types-csv-common';
import type { CookieCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('svlReportingApi');
  const svlCommonApi = getService('svlCommonApi');
  const samlAuth = getService('samlAuth');
  let cookieCredentials: CookieCredentials;
  let internalReqHeader: InternalRequestHeader;

  /*
   * Helper function to decorate with common fields needed in the API call
   */
  const createTestCsvJobParams = (
    params: Omit<JobParamsCsvV2, 'title' | 'version' | 'objectType' | 'browserTimezone'> &
      Partial<JobParamsCsvV2>
  ) => {
    return {
      title: 'CSV Report',
      version: '9.2.0',
      browserTimezone: 'UTC',
      objectType: 'search',
      ...params,
    };
  };

  const archives: Record<string, { data: string; savedObjects: string }> = {
    ecommerce: {
      data: 'x-pack/platform/test/fixtures/es_archives/reporting/ecommerce',
      savedObjects: 'x-pack/platform/test/functional/fixtures/kbn_archives/reporting/ecommerce',
    },
    unmappedFields: {
      data: 'x-pack/platform/test/fixtures/es_archives/reporting/unmapped_fields',
      savedObjects:
        'x-pack/platform/test/functional/fixtures/kbn_archives/reporting/unmapped_fields.json',
    },
    logs: {
      data: 'x-pack/platform/test/fixtures/es_archives/logstash_functional',
      savedObjects: 'x-pack/platform/test/serverless/fixtures/kbn_archives/reporting/logs',
    },
    nanos: {
      data: 'x-pack/platform/test/fixtures/es_archives/reporting/nanos',
      savedObjects: 'x-pack/platform/test/serverless/fixtures/kbn_archives/reporting/logs',
    },
    sales: {
      data: 'x-pack/platform/test/fixtures/es_archives/reporting/sales',
      savedObjects: 'x-pack/platform/test/serverless/fixtures/kbn_archives/reporting/logs',
    },
    bigIntIdField: {
      data: 'x-pack/platform/test/fixtures/es_archives/reporting/big_int_id_field',
      savedObjects:
        'x-pack/platform/test/functional/fixtures/kbn_archives/reporting/big_int_id_field',
    },
  };

  const createPartialCsv = (csvFile: unknown) => {
    const partialCsvFile = (csvFile as string).split('\n').slice(0, 4);
    return partialCsvFile.join('\n');
  };

  /*
   * Tests
   */
  describe('Generate CSV from csv_v2', function () {
    // 12 minutes timeout for each test in serverless
    // This is because it may take up to 10 minutes to generate the CSV
    // see kibanaReportCompletion config
    this.timeout(12 * 60 * 1000);

    before(async () => {
      cookieCredentials = await samlAuth.getM2MApiCookieCredentialsWithRoleScope('admin', {
        forceNewSession: true,
      });
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });

    beforeEach(async () => {
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': true,
        'dateFormat:tz': 'UTC',
      });
    });

    describe('exported CSV', () => {
      before(async () => {
        await esArchiver.load(archives.ecommerce.data);
        await kibanaServer.importExport.load(archives.ecommerce.savedObjects);
      });

      after(async () => {
        await esArchiver.unload(archives.ecommerce.data);
        await kibanaServer.importExport.unload(archives.ecommerce.savedObjects);
      });

      it('file matches snapshot', async () => {
        const fromTime = '2019-06-20T00:00:00.000Z';
        const toTime = '2019-06-24T00:00:00.000Z';

        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            browserTimezone: 'UTC',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: '5193f870-d861-11e9-a311-0fa548c5f953',
                  columns: [
                    'order_date',
                    'category',
                    'currency',
                    'customer_id',
                    'order_id',
                    'day_of_week_i',
                    'products.created_on',
                    'sku',
                  ],
                  sort: [
                    ['order_date', 'desc'],
                    ['order_id', 'desc'],
                  ],
                  timeRange: { from: fromTime, to: toTime },
                },
                version: '9.2.0',
              },
            ],
            objectType: 'search',
            title: 'Ecommerce Data',
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        const csvFile = await reportingAPI.getCompletedJobOutput(
          res.path,
          cookieCredentials,
          internalReqHeader
        );
        // expect((csvFile as string).length).to.be(124183);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('with unmapped fields', () => {
      before(async () => {
        await esArchiver.load(archives.unmappedFields.data);
        await kibanaServer.importExport.load(archives.unmappedFields.savedObjects);
      });

      after(async () => {
        await esArchiver.unload(archives.unmappedFields.data);
        await kibanaServer.importExport.unload(archives.unmappedFields.savedObjects);
      });

      // Helper function
      async function generateCsvReportWithUnmapped(columns?: string[]) {
        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            browserTimezone: 'UTC',
            objectType: 'search',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: '5c620ea0-dc4f-11ec-972a-bf98ce1eebd7',
                  columns,
                },
                version: '9.2.0',
              },
            ],
            title: 'Untitled discover search',
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        return reportingAPI.getCompletedJobOutput(res.path, cookieCredentials, internalReqHeader);
      }

      it('includes an unmapped field to the report', async () => {
        const csvFile = await generateCsvReportWithUnmapped([
          '_id',
          '_ignored',
          '_index',
          '_score',
          'text',
          'unmapped',
        ]);
        // expect((csvFile as string).length).to.be(111);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('includes an unmapped nested field to the report', async () => {
        const csvFile = await generateCsvReportWithUnmapped([
          '_id',
          '_ignored',
          '_index',
          '_score',
          'nested.unmapped',
          'text',
        ]);
        // expect((csvFile as string).length).to.be(120);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('includes all unmapped fields to the report', async () => {
        const csvFile = await generateCsvReportWithUnmapped();
        // expect((csvFile as string).length).to.be(143);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('unquoted values', () => {
      const fromTime = '2019-06-20T00:00:00.000Z';
      const toTime = '2019-06-25T00:00:00.000Z';

      before(async () => {
        await esArchiver.load(archives.ecommerce.data);
        await kibanaServer.importExport.load(archives.ecommerce.savedObjects);
        await kibanaServer.uiSettings.update({
          'csv:quoteValues': false,
          'dateFormat:tz': 'UTC',
        });
      });

      after(async () => {
        await esArchiver.unload(archives.ecommerce.data);
        await kibanaServer.importExport.unload(archives.ecommerce.savedObjects);
        await kibanaServer.uiSettings.update({
          'csv:quoteValues': true,
          'dateFormat:tz': 'UTC',
        });
      });

      it('Exports CSV with almost all fields when using fieldsFromSource', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            title: 'fieldsFromSource CSV Report',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: '5193f870-d861-11e9-a311-0fa548c5f953',
                  fieldsFromSource: [
                    '_id',
                    '_index',
                    '_score',
                    '_source',
                    '_type',
                    'category',
                    'category.keyword',
                    'currency',
                    'customer_birth_date',
                    'customer_first_name',
                    'customer_first_name.keyword',
                    'customer_full_name',
                    'customer_full_name.keyword',
                    'customer_gender',
                    'customer_id',
                    'customer_last_name',
                    'customer_last_name.keyword',
                    'customer_phone',
                    'day_of_week',
                    'day_of_week_i',
                    'email',
                    'geoip.city_name',
                    'geoip.continent_name',
                    'geoip.country_iso_code',
                    'geoip.location',
                    'geoip.region_name',
                    'manufacturer',
                    'manufacturer.keyword',
                    'order_date',
                    'order_id',
                    'products._id',
                    'products._id.keyword',
                    'products.base_price',
                    'products.base_unit_price',
                    'products.category',
                    'products.category.keyword',
                    'products.created_on',
                    'products.discount_amount',
                    'products.discount_percentage',
                    'products.manufacturer',
                    'products.manufacturer.keyword',
                    'products.min_price',
                    'products.price',
                    'products.product_id',
                    'products.product_name',
                    'products.product_name.keyword',
                    'products.quantity',
                    'products.sku',
                    'products.tax_amount',
                    'products.taxful_price',
                    'products.taxless_price',
                    'products.unit_discount_amount',
                    'sku',
                    'taxful_total_price',
                    'taxless_total_price',
                    'total_quantity',
                    'total_unique_products',
                    'type',
                    'user',
                  ],
                  filter: [
                    {
                      meta: { index: '5193f870-d861-11e9-a311-0fa548c5f953', params: {} },
                      range: {
                        order_date: {
                          gte: fromTime,
                          lte: toTime,
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                  sort: [
                    ['order_date', 'desc'],
                    ['order_id', 'desc'],
                  ],
                },
                version: '9.2.0',
              },
            ],
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        const csvFile = await reportingAPI.getCompletedJobOutput(
          res.path,
          cookieCredentials,
          internalReqHeader
        );
        // expect((csvFile as string).length).to.be(1270683);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('Exports CSV with all fields when using defaults', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            title: 'All Fields CSV Report',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: '5193f870-d861-11e9-a311-0fa548c5f953',
                  sort: [
                    ['order_date', 'desc'],
                    ['order_id', 'desc'],
                  ],
                  timeRange: { from: fromTime, to: toTime },
                },
                version: '9.2.0',
              },
            ],
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        const csvFile = await reportingAPI.getCompletedJobOutput(
          res.path,
          cookieCredentials,
          internalReqHeader
        );
        // expect((csvFile as string).length).to.be(918298);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('date formatting', () => {
      before(async () => {
        await esArchiver.load(archives.logs.data);
        await kibanaServer.importExport.load(archives.logs.savedObjects);
      });

      after(async () => {
        await kibanaServer.importExport.unload(archives.logs.savedObjects);
        await esArchiver.unload(archives.logs.data);
      });

      it('With filters and timebased data, default to UTC', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            browserTimezone: undefined,
            title: 'Default Timezone CSV Report',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: 'logstash-*',
                  columns: ['@timestamp', 'clientip', 'extension'],
                  sort: [['@timestamp', 'desc']],
                  timeRange: {
                    from: '2015-09-20T10:19:40.307Z',
                    to: '2015-09-20T10:26:56.221Z',
                  },
                },
                version: '9.2.0',
              },
            ],
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        const csvFile = await reportingAPI.getCompletedJobOutput(
          res.path,
          cookieCredentials,
          internalReqHeader
        );
        // expect((csvFile as string).length).to.be(3020);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('With filters and timebased data, non-default timezone', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            title: 'CSV Report of Non-Default Timezone',
            browserTimezone: 'America/Phoenix',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: 'logstash-*',
                  columns: ['@timestamp', 'clientip', 'extension'],
                  filters: [
                    {
                      $state: { store: 'appState' },
                      meta: {
                        alias: null,
                        disabled: false,
                        field: '@timestamp',
                        index: 'logstash-*',
                        key: '@timestamp',
                        negate: false,
                        params: {
                          gte: '2015-09-20T10:19:40.307Z',
                          lt: '2015-09-20T10:26:56.221Z',
                        },
                        type: 'range',
                        value: {
                          gte: '2015-09-20T10:19:40.307Z',
                          lt: '2015-09-20T10:26:56.221Z',
                        },
                      },
                      query: {
                        range: {
                          '@timestamp': {
                            gte: '2015-01-12T07:00:55.654Z',
                            lt: '2016-01-29T21:08:10.881Z',
                          },
                        },
                      },
                    },
                  ],
                  sort: [['@timestamp', 'desc']],
                },
                version: '9.2.0',
              },
            ],
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        const csvFile = await reportingAPI.getCompletedJobOutput(
          res.path,
          cookieCredentials,
          internalReqHeader
        );
        // expect((csvFile as string).length).to.be(3020);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('nanosecond formatting', () => {
      before(async () => {
        await esArchiver.load(archives.nanos.data);
        await kibanaServer.importExport.load(archives.nanos.savedObjects);
      });

      after(async () => {
        await esArchiver.unload(archives.nanos.data);
        await kibanaServer.importExport.unload(archives.nanos.savedObjects);
      });

      it('Formatted date_nanos data, UTC timezone', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            title: 'Date_Nanos CSV Report',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: '907bc200-a294-11e9-a900-ef10e0ac769e',
                  sort: [['date', 'desc']],
                  columns: ['date', 'message'],
                  timeRange: {
                    from: '2019-07-01T00:00:00.000Z',
                    to: '2019-07-02T00:00:00.000Z',
                  },
                },
                version: '9.2.0',
              },
            ],
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        const csvFile = await reportingAPI.getCompletedJobOutput(
          res.path,
          cookieCredentials,
          internalReqHeader
        );
        // expect((csvFile as string).length).to.be(103);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('Formatted date_nanos data, custom timezone (New York)', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            browserTimezone: 'America/New_York',
            title: 'Date_Nanos New York Timezone CSV Report',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: '907bc200-a294-11e9-a900-ef10e0ac769e',
                  sort: [['date', 'desc']],
                  columns: ['date', 'message'],
                },
                version: '9.2.0',
              },
            ],
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        const csvFile = await reportingAPI.getCompletedJobOutput(
          res.path,
          cookieCredentials,
          internalReqHeader
        );
        // expect((csvFile as string).length).to.be(103);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('non-timebased', () => {
      before(async () => {
        await esArchiver.load(archives.nanos.data);
        await kibanaServer.importExport.load(archives.nanos.savedObjects);
        await esArchiver.load(archives.sales.data);
        await kibanaServer.importExport.load(archives.sales.savedObjects);
      });

      after(async () => {
        await esArchiver.unload(archives.nanos.data);
        await kibanaServer.importExport.unload(archives.nanos.savedObjects);
        await esArchiver.unload(archives.sales.data);
        await kibanaServer.importExport.unload(archives.sales.savedObjects);
      });

      it('Handle _id and _index columns', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            title: 'Handled _id and _index columns CSV Report',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: '907bc200-a294-11e9-a900-ef10e0ac769e',
                  sort: [['date', 'desc']],
                  columns: ['date', 'message', '_id', '_index'],
                },
                version: '9.2.0',
              },
            ],
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        const csvFile = await reportingAPI.getCompletedJobOutput(
          res.path,
          cookieCredentials,
          internalReqHeader
        );
        // expect((csvFile as string).length).to.be(134);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });

      it('With filters and non-timebased data', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            title: 'Filters and Non-Timebased Data CSV Report',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: 'timeless-sales',
                  sort: [['power', 'asc']],
                  columns: ['name', 'power'],
                  filters: [
                    {
                      $state: { store: 'appState' },
                      meta: {
                        alias: null,
                        disabled: false,
                        field: 'power',
                        index: 'timeless-sales',
                        key: 'power',
                        negate: false,
                        params: { gte: '1' },
                        type: 'range',
                        value: { gte: '1' },
                      },
                      query: { range: { power: { gte: '1' } } },
                    },
                  ],
                },
                version: '9.2.0',
              },
            ],
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        const csvFile = await reportingAPI.getCompletedJobOutput(
          res.path,
          cookieCredentials,
          internalReqHeader
        );
        // expect((csvFile as string).length).to.be(274);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('_id field is a big integer', () => {
      before(async () => {
        await Promise.all([
          esArchiver.load(archives.bigIntIdField.data),
          kibanaServer.importExport.load(archives.bigIntIdField.savedObjects),
        ]);
      });

      after(async () => {
        await Promise.all([
          esArchiver.unload(archives.bigIntIdField.data),
          kibanaServer.importExport.unload(archives.bigIntIdField.savedObjects),
        ]);
      });

      it('passes through the value without mutation', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            title: 'A Big Integer for _id CSV Report',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: 'c424ce04-f440-4f48-aa0c-534da84d06f6',
                  sort: [['timestamp', 'desc']],
                  timeRange: {
                    from: '2007-10-25T21:18:23.905Z',
                    to: '2022-10-30T00:00:00.000Z',
                  },
                },
                version: '9.2.0',
              },
            ],
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        const csvFile = await reportingAPI.getCompletedJobOutput(
          res.path,
          cookieCredentials,
          internalReqHeader
        );
        // expect((csvFile as string).length).to.be(356);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });

    describe('validation', () => {
      before(async () => {
        await esArchiver.load(archives.ecommerce.data);
        await kibanaServer.importExport.load(archives.ecommerce.savedObjects);
      });

      after(async () => {
        await esArchiver.unload(archives.ecommerce.data);
        await kibanaServer.importExport.unload(archives.ecommerce.savedObjects);
      });

      // NOTE: this test requires having the test server run with `xpack.reporting.csv.maxSizeBytes=6000`
      it('Searches large amount of data, stops at Max Size Reached', async () => {
        const res = await reportingAPI.createReportJobInternal(
          'csv_v2',
          createTestCsvJobParams({
            title: 'Large Data and Max Size Reached CSV Report',
            locatorParams: [
              {
                id: 'DISCOVER_APP_LOCATOR',
                params: {
                  dataViewId: '5193f870-d861-11e9-a311-0fa548c5f953',
                  sort: [
                    ['order_date', 'desc'],
                    ['order_id', 'desc'],
                  ],
                  timeRange: {
                    from: '2019-03-23T00:00:00.000Z',
                    to: '2019-10-04T00:00:00.000Z',
                  },
                },
                version: '9.2.0',
              },
            ],
          }),
          cookieCredentials,
          internalReqHeader
        );
        await reportingAPI.waitForJobToFinish(res.path, cookieCredentials, internalReqHeader);
        const csvFile = await reportingAPI.getCompletedJobOutput(
          res.path,
          cookieCredentials,
          internalReqHeader
        );
        // expect((csvFile as string).length).to.be(4845684);
        expectSnapshot(createPartialCsv(csvFile)).toMatch();
      });
    });
  });
}
