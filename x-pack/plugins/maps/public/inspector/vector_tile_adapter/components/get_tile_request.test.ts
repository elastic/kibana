/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTileRequest } from './get_tile_request';

test('Should return elasticsearch vector tile request for aggs tiles', () => {
  expect(
    getTileRequest({
      layerId: '1',
      tileUrl: `/pof/api/maps/mvt/getGridTile/{z}/{x}/{y}.pbf?geometryFieldName=geo.coordinates&hasLabels=false&index=kibana_sample_data_logs&gridPrecision=8&requestBody=(_source%3A(excludes%3A!())%2Caggs%3A()%2Cfields%3A!((field%3A'%40timestamp'%2Cformat%3Adate_time)%2C(field%3Atimestamp%2Cformat%3Adate_time)%2C(field%3Autc_time%2Cformat%3Adate_time))%2Cquery%3A(bool%3A(filter%3A!((match_phrase%3A(machine.os.keyword%3Aios))%2C(range%3A(timestamp%3A(format%3Astrict_date_optional_time%2Cgte%3A'2022-04-22T16%3A46%3A00.744Z'%2Clte%3A'2022-04-29T16%3A46%3A05.345Z'))))%2Cmust%3A!()%2Cmust_not%3A!()%2Cshould%3A!()))%2Cruntime_mappings%3A(hour_of_day%3A(script%3A(source%3A'emit(doc%5B!'timestamp!'%5D.value.getHour())%3B')%2Ctype%3Along))%2Cscript_fields%3A()%2Csize%3A0%2Cstored_fields%3A!('*'))&renderAs=heatmap&token=e8bff005-ccea-464a-ae56-2061b4f8ce68`,
      x: 3,
      y: 0,
      z: 2,
    })
  ).toEqual({
    path: '/kibana_sample_data_logs/_mvt/geo.coordinates/2/3/0',
    body: {
      size: 0,
      grid_precision: 8,
      exact_bounds: false,
      extent: 4096,
      query: {
        bool: {
          filter: [
            {
              match_phrase: {
                'machine.os.keyword': 'ios',
              },
            },
            {
              range: {
                timestamp: {
                  format: 'strict_date_optional_time',
                  gte: '2022-04-22T16:46:00.744Z',
                  lte: '2022-04-29T16:46:05.345Z',
                },
              },
            },
          ],
          must: [],
          must_not: [],
          should: [],
        },
      },
      grid_agg: 'geotile',
      grid_type: 'centroid',
      aggs: {},
      fields: [
        {
          field: '@timestamp',
          format: 'date_time',
        },
        {
          field: 'timestamp',
          format: 'date_time',
        },
        {
          field: 'utc_time',
          format: 'date_time',
        },
      ],
      runtime_mappings: {
        hour_of_day: {
          script: {
            source: "emit(doc['timestamp'].value.getHour());",
          },
          type: 'long',
        },
      },
      with_labels: false,
    },
  });
});

test('Should return elasticsearch vector tile request for hits tiles', () => {
  expect(
    getTileRequest({
      layerId: '1',
      tileUrl: `http://localhost:5601/zuv/api/maps/mvt/getTile/4/2/6.pbf?geometryFieldName=geo.coordinates&index=kibana_sample_data_logs&hasLabels=true&requestBody=(_source%3A!f%2Cfields%3A!((field%3A%27%40timestamp%27%2Cformat%3Aepoch_millis)%2Cbytes)%2Cquery%3A(bool%3A(filter%3A!((range%3A(timestamp%3A(format%3Astrict_date_optional_time%2Cgte%3A%272022-06-15T20%3A00%3A00.000Z%27%2Clte%3A%272022-06-16T20%3A48%3A02.517Z%27))))%2Cmust%3A!()%2Cmust_not%3A!()%2Cshould%3A!()))%2Cruntime_mappings%3A(hour_of_day%3A(script%3A(source%3A%27emit(doc%5B!%27timestamp!%27%5D.value.getHour())%3B%27)%2Ctype%3Along))%2Csize%3A10000%2Csort%3A!((%27%40timestamp%27%3A(order%3Adesc%2Cunmapped_type%3Aboolean))))&token=7afe7c2d-c96b-4bdb-9b5e-819aceac80a1`,
      x: 0,
      y: 0,
      z: 2,
    })
  ).toEqual({
    path: '/kibana_sample_data_logs/_mvt/geo.coordinates/2/0/0',
    body: {
      grid_precision: 0,
      exact_bounds: true,
      extent: 4096,
      query: {
        bool: {
          filter: [
            {
              range: {
                timestamp: {
                  format: 'strict_date_optional_time',
                  gte: '2022-06-15T20:00:00.000Z',
                  lte: '2022-06-16T20:48:02.517Z',
                },
              },
            },
          ],
          must: [],
          must_not: [],
          should: [],
        },
      },
      fields: [
        {
          field: '@timestamp',
          format: 'epoch_millis',
        },
        'bytes',
      ],
      runtime_mappings: {
        hour_of_day: {
          script: {
            source: "emit(doc['timestamp'].value.getHour());",
          },
          type: 'long',
        },
      },
      sort: [
        {
          '@timestamp': {
            order: 'desc',
            unmapped_type: 'boolean',
          },
        },
      ],
      track_total_hits: 10001,
      with_labels: true,
    },
  });
});
