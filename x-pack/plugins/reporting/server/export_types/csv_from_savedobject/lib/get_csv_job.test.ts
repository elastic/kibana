/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobParamsPanelCsv, SearchPanel } from '../types';
import { getGenerateCsvParams } from './get_csv_job';

describe('Get CSV Job', () => {
  let mockJobParams: JobParamsPanelCsv;
  let mockSearchPanel: SearchPanel;
  let mockSavedObjectsClient: any;
  let mockUiSettingsClient: any;
  beforeEach(() => {
    mockJobParams = { isImmediate: true, savedObjectType: 'search', savedObjectId: '234-ididid' };
    mockSearchPanel = {
      indexPatternSavedObjectId: '123-indexId',
      attributes: {
        title: 'my search',
        sort: [],
        kibanaSavedObjectMeta: {
          searchSource: { query: { isSearchSourceQuery: true }, filter: [] },
        },
        uiState: 56,
      },
      timerange: { timezone: 'PST', min: 0, max: 100 },
    };
    mockSavedObjectsClient = {
      get: () => ({
        attributes: { fields: null, title: null, timeFieldName: null },
      }),
    };
    mockUiSettingsClient = {
      get: () => ({}),
    };
  });

  it('creates a data structure needed by generateCsv', async () => {
    const result = await getGenerateCsvParams(
      mockJobParams,
      mockSearchPanel,
      mockSavedObjectsClient,
      mockUiSettingsClient
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "conflictedTypesFields": Array [],
        "fields": Array [],
        "indexPatternSavedObject": Object {
          "attributes": Object {
            "fields": null,
            "timeFieldName": null,
            "title": null,
          },
          "fields": Array [],
          "timeFieldName": null,
          "title": null,
        },
        "jobParams": Object {
          "browserTimezone": "PST",
        },
        "metaFields": Array [],
        "searchRequest": Object {
          "body": Object {
            "_source": Object {
              "includes": Array [],
            },
            "docvalue_fields": undefined,
            "query": Object {
              "bool": Object {
                "filter": Array [],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            "script_fields": Object {},
            "sort": Array [],
          },
          "index": null,
        },
      }
    `);
  });

  it('uses query and sort from the payload', async () => {
    mockJobParams.post = {
      state: {
        query: ['this is the query'],
        sort: ['this is the sort'],
      },
    };
    const result = await getGenerateCsvParams(
      mockJobParams,
      mockSearchPanel,
      mockSavedObjectsClient,
      mockUiSettingsClient
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "conflictedTypesFields": Array [],
        "fields": Array [],
        "indexPatternSavedObject": Object {
          "attributes": Object {
            "fields": null,
            "timeFieldName": null,
            "title": null,
          },
          "fields": Array [],
          "timeFieldName": null,
          "title": null,
        },
        "jobParams": Object {
          "browserTimezone": "PST",
        },
        "metaFields": Array [],
        "searchRequest": Object {
          "body": Object {
            "_source": Object {
              "includes": Array [],
            },
            "docvalue_fields": undefined,
            "query": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "0": "this is the query",
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            "script_fields": Object {},
            "sort": Array [
              "this is the sort",
            ],
          },
          "index": null,
        },
      }
    `);
  });

  it('uses timerange timezone from the payload', async () => {
    mockJobParams.post = {
      timerange: { timezone: 'Africa/Timbuktu', min: 0, max: 9000 },
    };
    const result = await getGenerateCsvParams(
      mockJobParams,
      mockSearchPanel,
      mockSavedObjectsClient,
      mockUiSettingsClient
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "conflictedTypesFields": Array [],
        "fields": Array [],
        "indexPatternSavedObject": Object {
          "attributes": Object {
            "fields": null,
            "timeFieldName": null,
            "title": null,
          },
          "fields": Array [],
          "timeFieldName": null,
          "title": null,
        },
        "jobParams": Object {
          "browserTimezone": "Africa/Timbuktu",
        },
        "metaFields": Array [],
        "searchRequest": Object {
          "body": Object {
            "_source": Object {
              "includes": Array [],
            },
            "docvalue_fields": undefined,
            "query": Object {
              "bool": Object {
                "filter": Array [],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            "script_fields": Object {},
            "sort": Array [],
          },
          "index": null,
        },
      }
    `);
  });

  it('uses timerange min and max (numeric) when index pattern has timefieldName', async () => {
    mockJobParams.post = {
      timerange: { timezone: 'Africa/Timbuktu', min: 0, max: 900000000 },
    };
    mockSavedObjectsClient = {
      get: () => ({
        attributes: { fields: null, title: 'test search', timeFieldName: '@test_time' },
      }),
    };
    const result = await getGenerateCsvParams(
      mockJobParams,
      mockSearchPanel,
      mockSavedObjectsClient,
      mockUiSettingsClient
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "conflictedTypesFields": Array [],
        "fields": Array [
          "@test_time",
        ],
        "indexPatternSavedObject": Object {
          "attributes": Object {
            "fields": null,
            "timeFieldName": "@test_time",
            "title": "test search",
          },
          "fields": Array [],
          "timeFieldName": "@test_time",
          "title": "test search",
        },
        "jobParams": Object {
          "browserTimezone": "Africa/Timbuktu",
        },
        "metaFields": Array [],
        "searchRequest": Object {
          "body": Object {
            "_source": Object {
              "includes": Array [
                "@test_time",
              ],
            },
            "docvalue_fields": undefined,
            "query": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "@test_time": Object {
                        "format": "strict_date_time",
                        "gte": "1970-01-01T00:00:00Z",
                        "lte": "1970-01-11T10:00:00Z",
                      },
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            "script_fields": Object {},
            "sort": Array [],
          },
          "index": "test search",
        },
      }
    `);
  });

  it('uses timerange min and max (string) when index pattern has timefieldName', async () => {
    mockJobParams.post = {
      timerange: {
        timezone: 'Africa/Timbuktu',
        min: '1980-01-01T00:00:00Z',
        max: '1990-01-01T00:00:00Z',
      },
    };
    mockSavedObjectsClient = {
      get: () => ({
        attributes: { fields: null, title: 'test search', timeFieldName: '@test_time' },
      }),
    };
    const result = await getGenerateCsvParams(
      mockJobParams,
      mockSearchPanel,
      mockSavedObjectsClient,
      mockUiSettingsClient
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "conflictedTypesFields": Array [],
        "fields": Array [
          "@test_time",
        ],
        "indexPatternSavedObject": Object {
          "attributes": Object {
            "fields": null,
            "timeFieldName": "@test_time",
            "title": "test search",
          },
          "fields": Array [],
          "timeFieldName": "@test_time",
          "title": "test search",
        },
        "jobParams": Object {
          "browserTimezone": "Africa/Timbuktu",
        },
        "metaFields": Array [],
        "searchRequest": Object {
          "body": Object {
            "_source": Object {
              "includes": Array [
                "@test_time",
              ],
            },
            "docvalue_fields": undefined,
            "query": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "@test_time": Object {
                        "format": "strict_date_time",
                        "gte": "1980-01-01T00:00:00Z",
                        "lte": "1990-01-01T00:00:00Z",
                      },
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            "script_fields": Object {},
            "sort": Array [],
          },
          "index": "test search",
        },
      }
    `);
  });
});
