/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../kibana_services', () => {});

// @ts-ignore
import { convertCompositeRespToGeoJson, convertRegularRespToGeoJson } from './convert_to_geojson';
import { RENDER_AS } from '../../../../common/constants';

describe('convertCompositeRespToGeoJson', () => {
  const esResponse = {
    aggregations: {
      compositeSplit: {
        after_key: {
          gridSplit: '10/327/460',
        },
        buckets: [
          {
            key: { gridSplit: '4/4/6' },
            doc_count: 65,
            avg_of_bytes: { value: 5359.2307692307695 },
            'terms_of_machine.os.keyword': {
              buckets: [
                {
                  key: 'win xp',
                  doc_count: 16,
                },
              ],
            },
            gridCentroid: {
              location: { lat: 36.62813963153614, lon: -81.94552666092149 },
              count: 65,
            },
          },
        ],
      },
    },
  };

  it('Should convert elasticsearch aggregation response into feature collection of points', () => {
    const features = convertCompositeRespToGeoJson(esResponse, RENDER_AS.POINT);
    expect(features.length).toBe(1);
    expect(features[0]).toEqual({
      geometry: {
        coordinates: [-81.94552666092149, 36.62813963153614],
        type: 'Point',
      },
      id: '4/4/6',
      properties: {
        avg_of_bytes: 5359.2307692307695,
        doc_count: 65,
        'terms_of_machine.os.keyword': 'win xp',
        'terms_of_machine.os.keyword__percentage': 25,
      },
      type: 'Feature',
    });
  });

  it('Should convert elasticsearch aggregation response into feature collection of Polygons', () => {
    const features = convertCompositeRespToGeoJson(esResponse, RENDER_AS.GRID);
    expect(features.length).toBe(1);
    expect(features[0]).toEqual({
      geometry: {
        coordinates: [
          [
            [-67.5, 40.9799],
            [-90, 40.9799],
            [-90, 21.94305],
            [-67.5, 21.94305],
            [-67.5, 40.9799],
          ],
        ],
        type: 'Polygon',
      },
      id: '4/4/6',
      properties: {
        avg_of_bytes: 5359.2307692307695,
        doc_count: 65,
        'terms_of_machine.os.keyword': 'win xp',
        'terms_of_machine.os.keyword__percentage': 25,
      },
      type: 'Feature',
    });
  });
});

describe('convertRegularRespToGeoJson', () => {
  const esResponse = {
    aggregations: {
      gridSplit: {
        buckets: [
          {
            key: '4/4/6',
            doc_count: 65,
            avg_of_bytes: { value: 5359.2307692307695 },
            'terms_of_machine.os.keyword': {
              buckets: [
                {
                  key: 'win xp',
                  doc_count: 16,
                },
              ],
            },
            gridCentroid: {
              location: { lat: 36.62813963153614, lon: -81.94552666092149 },
              count: 65,
            },
          },
        ],
      },
    },
  };

  it('Should convert elasticsearch aggregation response into feature collection of points', () => {
    const features = convertRegularRespToGeoJson(esResponse, RENDER_AS.POINT);
    expect(features.length).toBe(1);
    expect(features[0]).toEqual({
      geometry: {
        coordinates: [-81.94552666092149, 36.62813963153614],
        type: 'Point',
      },
      id: '4/4/6',
      properties: {
        avg_of_bytes: 5359.2307692307695,
        doc_count: 65,
        'terms_of_machine.os.keyword': 'win xp',
        'terms_of_machine.os.keyword__percentage': 25,
      },
      type: 'Feature',
    });
  });

  it('Should convert elasticsearch aggregation response into feature collection of Polygons', () => {
    const features = convertRegularRespToGeoJson(esResponse, RENDER_AS.GRID);
    expect(features.length).toBe(1);
    expect(features[0]).toEqual({
      geometry: {
        coordinates: [
          [
            [-67.5, 40.9799],
            [-90, 40.9799],
            [-90, 21.94305],
            [-67.5, 21.94305],
            [-67.5, 40.9799],
          ],
        ],
        type: 'Polygon',
      },
      id: '4/4/6',
      properties: {
        avg_of_bytes: 5359.2307692307695,
        doc_count: 65,
        'terms_of_machine.os.keyword': 'win xp',
        'terms_of_machine.os.keyword__percentage': 25,
      },
      type: 'Feature',
    });
  });
});
