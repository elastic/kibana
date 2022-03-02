/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const results = {
  took: 9,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 19,
      relation: 'eq',
    },
    max_score: 4.4813457,
    hits: [
      {
        _index: '.ml-anomalies-shared',
        _id: 'test-tooltip-one_record_1645974000000_900_0_0_0',
        _score: 4.4813457,
        _source: {
          job_id: 'test-tooltip-one',
          result_type: 'record',
          probability: 0.00042878057629659614,
          multi_bucket_impact: -5,
          record_score: 77.74620142126848,
          initial_record_score: 77.74620142126848,
          bucket_span: 900,
          detector_index: 0,
          is_interim: false,
          timestamp: 1645974000000,
          function: 'lat_long',
          function_description: 'lat_long',
          typical: [39.9864616394043, -97.862548828125],
          actual: [29.261693651787937, -121.93940273718908],
          field_name: 'geo.coordinates',
          influencers: [
            {
              influencer_field_name: 'geo.dest',
              influencer_field_values: ['CN', 'DO', 'RU', 'US'],
            },
            {
              influencer_field_name: 'clientip',
              influencer_field_values: [
                '108.131.25.207',
                '192.41.143.247',
                '194.12.201.131',
                '41.91.106.242',
              ],
            },
            {
              influencer_field_name: 'agent.keyword',
              influencer_field_values: [
                'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
                'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
                'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
              ],
            },
          ],
          geo_results: {
            typical_point: '39.986461639404,-97.862548828125',
            actual_point: '29.261693651788,-121.939402737189',
          },
          'geo.dest': ['CN', 'DO', 'RU', 'US'],
          'agent.keyword': [
            'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
            'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
            'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
          ],
          clientip: ['108.131.25.207', '192.41.143.247', '194.12.201.131', '41.91.106.242'],
        },
      },
    ],
  },
};

export const typicalExpected = {
  features: [
    {
      geometry: { coordinates: [-97.862548828125, 39.986461639404], type: 'Point' },
      properties: {
        actual: [-121.939402737189, 29.261693651788],
        actualDisplay: [-121.94, 29.26],
        fieldName: 'geo.coordinates',
        functionDescription: 'lat_long',
        influencers:
          '<ul><li>geo.dest: CN, DO, RU</li><li>clientip: 108.131.25.207, 192.41.143.247, 194.12.201.131</li><li>agent.keyword: Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322), Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24, Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1</li></ul>',
        record_score: 77,
        timestamp: 'February 27th 2022, 10:00:00',
        typical: [-97.862548828125, 39.986461639404],
        typicalDisplay: [-97.86, 39.99],
      },
      type: 'Feature',
    },
  ],
  type: 'FeatureCollection',
};

export const actualExpected = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-121.939402737189, 29.261693651788],
      },
      properties: {
        actual: [-121.939402737189, 29.261693651788],
        actualDisplay: [-121.94, 29.26],
        typical: [-97.862548828125, 39.986461639404],
        typicalDisplay: [-97.86, 39.99],
        fieldName: 'geo.coordinates',
        functionDescription: 'lat_long',
        timestamp: 'February 27th 2022, 10:00:00',
        record_score: 77,
        influencers:
          '<ul><li>geo.dest: CN, DO, RU</li><li>clientip: 108.131.25.207, 192.41.143.247, 194.12.201.131</li><li>agent.keyword: Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322), Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24, Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1</li></ul>',
      },
    },
  ],
};
export const typicalToActualExpected = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-97.862548828125, 39.986461639404],
          [-121.939402737189, 29.261693651788],
        ],
      },
      properties: {
        actual: [-121.939402737189, 29.261693651788],
        actualDisplay: [-121.94, 29.26],
        typical: [-97.862548828125, 39.986461639404],
        typicalDisplay: [-97.86, 39.99],
        fieldName: 'geo.coordinates',
        functionDescription: 'lat_long',
        timestamp: 'February 27th 2022, 10:00:00',
        record_score: 77,
        influencers:
          '<ul><li>geo.dest: CN, DO, RU</li><li>clientip: 108.131.25.207, 192.41.143.247, 194.12.201.131</li><li>agent.keyword: Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322), Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24, Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1</li></ul>',
      },
    },
  ],
};

export const mlResultsServiceMock = {
  anomalySearch: () => results,
};
