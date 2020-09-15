/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import rison from 'rison-node';
import { createMapsUrlGenerator } from './url_generator';
import { LAYER_TYPE, SOURCE_TYPES, SCALING_TYPES } from '../common/constants';
import { esFilters } from '../../../../src/plugins/data/public';

const APP_BASE_PATH: string = 'test/app/maps';
const MAP_ID: string = '2c9c1f60-1909-11e9-919b-ffe5949a18d2';
const LAYER_ID: string = '13823000-99b9-11ea-9eb6-d9e8adceb647';
const INDEX_PATTERN_ID: string = '90943e30-9a47-11e8-b64d-95841ca0b247';

describe('visualize url generator', () => {
  test('creates a link to a new visualization', async () => {
    const generator = createMapsUrlGenerator(() =>
      Promise.resolve({
        appBasePath: APP_BASE_PATH,
        useHashedUrl: false,
      })
    );
    const url = await generator.createUrl!({});
    expect(url).toMatchInlineSnapshot(`"test/app/maps/map#/?_g=()&_a=()"`);
  });

  test('creates a link with global time range set up', async () => {
    const generator = createMapsUrlGenerator(() =>
      Promise.resolve({
        appBasePath: APP_BASE_PATH,
        useHashedUrl: false,
      })
    );
    const url = await generator.createUrl!({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
    });
    expect(url).toMatchInlineSnapshot(
      `"test/app/maps/map#/?_g=(time:(from:now-15m,mode:relative,to:now))&_a=()"`
    );
  });

  test('creates a link with initialLayers set up', async () => {
    const generator = createMapsUrlGenerator(() =>
      Promise.resolve({
        appBasePath: APP_BASE_PATH,
        useHashedUrl: false,
      })
    );
    const initialLayers = [
      {
        id: LAYER_ID,
        visible: true,
        type: LAYER_TYPE.VECTOR,
        sourceDescriptor: {
          id: LAYER_ID,
          type: SOURCE_TYPES.ES_SEARCH,
          tooltipProperties: [],
          label: 'Sample Data',
          indexPatternId: INDEX_PATTERN_ID,
          geoField: 'test',
          scalingType: SCALING_TYPES.LIMIT,
        },
      },
    ];
    const encodedLayers = rison.encode_array(initialLayers);
    const url = await generator.createUrl!({
      initialLayers,
    });
    expect(url).toMatchInlineSnapshot(
      `"test/app/maps/map#/?_g=()&_a=()&initialLayers=${encodedLayers}"`
    );
  });

  test('creates a link with filters, time range, refresh interval and query to a saved visualization', async () => {
    const generator = createMapsUrlGenerator(() =>
      Promise.resolve({
        appBasePath: APP_BASE_PATH,
        useHashedUrl: false,
      })
    );
    const url = await generator.createUrl!({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
      refreshInterval: { pause: false, value: 300 },
      mapId: MAP_ID,
      filters: [
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { query: 'q1' },
        },
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { query: 'q1' },
          $state: {
            store: esFilters.FilterStateStore.GLOBAL_STATE,
          },
        },
      ],
      query: { query: 'q2', language: 'kuery' },
    });
    expect(url).toMatchInlineSnapshot(
      `"test/app/maps/map#/${MAP_ID}?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,negate:!f),query:(query:q1))),refreshInterval:(pause:!f,value:300),time:(from:now-15m,mode:relative,to:now))&_a=(filters:!((meta:(alias:!n,disabled:!f,negate:!f),query:(query:q1))),query:(language:kuery,query:q2))"`
    );
  });
});
