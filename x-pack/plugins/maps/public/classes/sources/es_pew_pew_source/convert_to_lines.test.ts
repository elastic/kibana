/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { convertToLines } from './convert_to_lines';

const esResponse = {
  aggregations: {
    destSplit: {
      buckets: [
        {
          key: '43.68389896117151, 10.39269994944334',
          doc_count: 2,
          sourceGrid: {
            buckets: [
              {
                key: '4/9/3',
                doc_count: 1,
                terms_of_Carrier: {
                  buckets: [
                    {
                      key: 'ES-Air',
                      doc_count: 1,
                    },
                  ],
                },
                sourceCentroid: {
                  location: {
                    lat: 68.15180202014744,
                    lon: 33.46390150487423,
                  },
                  count: 1,
                },
                avg_of_FlightDelayMin: {
                  value: 3,
                },
              },
            ],
          },
        },
      ],
    },
  },
};

it('Should convert elasticsearch aggregation response into feature collection of lines', () => {
  const geoJson = convertToLines(esResponse);
  expect(geoJson.featureCollection.features.length).toBe(1);
  expect(geoJson.featureCollection.features[0]).toEqual({
    geometry: {
      coordinates: [
        [33.46390150487423, 68.15180202014744],
        [10.39269994944334, 43.68389896117151],
      ],
      type: 'LineString',
    },
    id: '10.39269994944334,43.68389896117151,4/9/3',
    properties: {
      avg_of_FlightDelayMin: 3,
      doc_count: 1,
      terms_of_Carrier: 'ES-Air',
      terms_of_Carrier__percentage: 100,
    },
    type: 'Feature',
  });
});
