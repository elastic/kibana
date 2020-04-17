/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingServiceMock } from '../../../../../../src/core/server/mocks';
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import { getAlertType } from './alert_type';
import { pick } from 'lodash';
import { alertsMock } from '../../../../alerting/server/mocks';
import { Params } from './alert_type_params';
import { FilterStateStore } from '../../../../../../src/plugins/data/common';
import uuid from 'uuid';
import moment from 'moment';

describe('alertType', () => {
  const service = {
    logger: loggingServiceMock.create().get(),
  };

  it('provides a specific action group', async () => {
    expect(pick(getAlertType(service), 'defaultActionGroupId', 'actionGroups'))
      .toMatchInlineSnapshot(`
      Object {
        "actionGroups": Array [
          Object {
            "id": "query matched",
            "name": "Query Matched",
          },
        ],
        "defaultActionGroupId": "query matched",
      }
    `);
  });

  describe('executor', () => {
    const { executor } = getAlertType(service);

    it('should run a search using the saved query', async () => {
      const services = createMockServicesWithEmptyResponses();

      services.savedObjectsClient.find.mockResolvedValue({
        page: 1,
        per_page: 20,
        total: 0,
        saved_objects: [],
      });

      const params: Params = {
        query: { query: 'dayOfWeek : * ', language: 'kuery' },
        filters: [
          {
            meta: {
              index: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
              alias: null,
              negate: true,
              disabled: false,
              type: 'phrase',
              key: 'Carrier',
              params: { query: 'JetBeats' },
              controlledBy: undefined,
              value: undefined,
            },
            query: { match_phrase: { Carrier: 'JetBeats' } },
            $state: { store: FilterStateStore.APP_STATE },
          },
        ],
        timefilter: undefined,
      };

      await executor({
        alertId: uuid.v4(),
        startedAt: new Date(),
        previousStartedAt: null,
        services,
        params: params as Record<string, any>,
        state: {},
        spaceId: uuid.v4(),
        name: 'name',
        tags: [],
        createdBy: null,
        updatedBy: null,
      });

      expect(services.search).toHaveBeenCalledWith(
        {
          params: {
            index: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
            body: {
              query: {
                bool: {
                  must: [],
                  filter: [
                    {
                      bool: {
                        should: [{ exists: { field: 'dayOfWeek' } }],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                  should: [],
                  must_not: [{ match_phrase: { Carrier: 'JetBeats' } }],
                },
              },
            },
          },
        },
        {},
        'es'
      );
    });

    it('should use the indexPattern if its available', async () => {
      const services = createMockServicesWithEmptyResponses();

      services.indexPattern.getById.mockResolvedValue(mockIndexPattern);

      const params: Params = {
        query: { query: 'dayOfWeek : * ', language: 'kuery' },
        filters: [
          {
            meta: {
              index: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
              alias: null,
              negate: true,
              disabled: false,
              type: 'phrase',
              key: 'Carrier',
              params: { query: 'JetBeats' },
              controlledBy: undefined,
              value: undefined,
            },
            query: { match_phrase: { Carrier: 'JetBeats' } },
            $state: { store: FilterStateStore.APP_STATE },
          },
        ],
        timefilter: { from: 'now-15m', to: 'now', mode: undefined },
      };

      await executor({
        alertId: uuid.v4(),
        startedAt: new Date(),
        previousStartedAt: null,
        services,
        params: params as Record<string, any>,
        state: {},
        spaceId: uuid.v4(),
        name: 'name',
        tags: [],
        createdBy: null,
        updatedBy: null,
      });

      const [searchQuery, searchOptions, searchStrategy] = services.search.mock.calls[0];

      expect(searchQuery).toMatchObject({
        params: {
          index: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          body: {
            query: {
              bool: {
                must: [],
                filter: [
                  {
                    bool: {
                      should: [{ exists: { field: 'dayOfWeek' } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    range: {
                      timestamp: {
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                ],
                should: [],
                must_not: [{ match_phrase: { Carrier: 'JetBeats' } }],
              },
            },
          },
        },
      });

      const { gte, lte } = searchQuery.params.body.query.bool.filter[1].range.timestamp;

      expect(
        moment(lte)
          .utc()
          .diff(moment(gte).utc(), 'm')
      ).toEqual(15);

      expect(searchOptions).toMatchObject({});
      expect(searchStrategy).toEqual('es');
    });
  });
});

function createMockServicesWithEmptyResponses() {
  const services = alertsMock.createAlertServices();

  services.indexPattern.getById.mockImplementation(async id => {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', id);
  });

  services.search.mockResolvedValue({
    rawResponse: { hits: { total: 0, hits: [] } },
  });

  return services;
}

const mockIndexPattern = {
  id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
  title: 'kibana_sample_data_flights',
  fieldFormatMap: {
    hour_of_day: {
      id: 'number',
      params: {
        parsedUrl: { origin: 'https://localhost:5601', pathname: '/app/kibana', basePath: '' },
        pattern: '00',
      },
    },
    AvgTicketPrice: {
      id: 'number',
      params: {
        parsedUrl: { origin: 'https://localhost:5601', pathname: '/app/kibana', basePath: '' },
        pattern: '$0,0.[00]',
      },
    },
  },
  fields: [
    {
      name: 'AvgTicketPrice',
      type: 'number',
      esTypes: ['float'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'Cancelled',
      type: 'boolean',
      esTypes: ['boolean'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'Carrier',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'Dest',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'DestAirportID',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'DestCityName',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'DestCountry',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'DestLocation',
      type: 'geo_point',
      esTypes: ['geo_point'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'DestRegion',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'DestWeather',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'DistanceKilometers',
      type: 'number',
      esTypes: ['float'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'DistanceMiles',
      type: 'number',
      esTypes: ['float'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'FlightDelay',
      type: 'boolean',
      esTypes: ['boolean'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'FlightDelayMin',
      type: 'number',
      esTypes: ['integer'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'FlightDelayType',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'FlightNum',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'FlightTimeHour',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'FlightTimeMin',
      type: 'number',
      esTypes: ['float'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'Origin',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'OriginAirportID',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'OriginCityName',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'OriginCountry',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'OriginLocation',
      type: 'geo_point',
      esTypes: ['geo_point'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'OriginRegion',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'OriginWeather',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: '_id',
      type: 'string',
      esTypes: ['_id'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    },
    {
      name: '_index',
      type: 'string',
      esTypes: ['_index'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    },
    {
      name: '_score',
      type: 'number',
      count: 0,
      scripted: false,
      searchable: false,
      aggregatable: false,
      readFromDocValues: false,
    },
    {
      name: '_source',
      type: '_source',
      esTypes: ['_source'],
      count: 0,
      scripted: false,
      searchable: false,
      aggregatable: false,
      readFromDocValues: false,
    },
    {
      name: '_type',
      type: 'string',
      esTypes: ['_type'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    },
    {
      name: 'dayOfWeek',
      type: 'number',
      esTypes: ['integer'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'timestamp',
      type: 'date',
      esTypes: ['date'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'hour_of_day',
      type: 'number',
      count: 0,
      scripted: true,
      script: "doc['timestamp'].value.hourOfDay",
      lang: 'painless',
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    },
  ],
  timeFieldName: 'timestamp',
  metaFields: ['_source', '_id', '_type', '_index', '_score'],
  version: 'WzIyLDFd',
  savedObjectsClient: {
    http: { basePath: { basePath: '', serverBasePath: '' }, anonymousPaths: {} },
    batchQueue: [],
  },
  patternCache: {},
  originalBody: {
    title: 'kibana_sample_data_flights',
    timeFieldName: 'timestamp',
    fields:
      '[{"name":"AvgTicketPrice","type":"number","esTypes":["float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"Cancelled","type":"boolean","esTypes":["boolean"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"Carrier","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"Dest","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestAirportID","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestCityName","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestCountry","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestLocation","type":"geo_point","esTypes":["geo_point"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestRegion","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestWeather","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DistanceKilometers","type":"number","esTypes":["float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DistanceMiles","type":"number","esTypes":["float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightDelay","type":"boolean","esTypes":["boolean"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightDelayMin","type":"number","esTypes":["integer"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightDelayType","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightNum","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightTimeHour","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightTimeMin","type":"number","esTypes":["float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"Origin","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginAirportID","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginCityName","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginCountry","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginLocation","type":"geo_point","esTypes":["geo_point"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginRegion","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginWeather","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"_id","type":"string","esTypes":["_id"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"_index","type":"string","esTypes":["_index"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"_score","type":"number","count":0,"scripted":false,"searchable":false,"aggregatable":false,"readFromDocValues":false},{"name":"_source","type":"_source","esTypes":["_source"],"count":0,"scripted":false,"searchable":false,"aggregatable":false,"readFromDocValues":false},{"name":"_type","type":"string","esTypes":["_type"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"dayOfWeek","type":"number","esTypes":["integer"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"timestamp","type":"date","esTypes":["date"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"hour_of_day","type":"number","count":0,"scripted":true,"script":"doc[\'timestamp\'].value.hourOfDay","lang":"painless","searchable":true,"aggregatable":true,"readFromDocValues":false}]',
    fieldFormatMap:
      '{"hour_of_day":{"id":"number","params":{"parsedUrl":{"origin":"https://localhost:5601","pathname":"/app/kibana","basePath":""},"pattern":"00"}},"AvgTicketPrice":{"id":"number","params":{"parsedUrl":{"origin":"https://localhost:5601","pathname":"/app/kibana","basePath":""},"pattern":"$0,0.[00]"}}}',
  },
  fieldsFetcher: {},
  shortDotsEnable: false,
  mapping: {
    title: { type: 'text' },
    timeFieldName: { type: 'keyword' },
    intervalName: { type: 'keyword' },
    fields: { type: 'text' },
    sourceFilters: { type: 'text' },
    fieldFormatMap: { type: 'text' },
    type: { type: 'keyword' },
    typeMeta: { type: 'text' },
  },
};
