/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAYER_TYPE, SOURCE_TYPES, SCALING_TYPES } from '../common/constants';
import { esFilters } from '../../../../src/plugins/data/public';
import { MapsAppLocatorDefinition } from './locators';
import { SerializableRecord } from '@kbn/utility-types';
import { LayerDescriptor } from '../common/descriptor_types';

const MAP_ID: string = '2c9c1f60-1909-11e9-919b-ffe5949a18d2';
const LAYER_ID: string = '13823000-99b9-11ea-9eb6-d9e8adceb647';
const INDEX_PATTERN_ID: string = '90943e30-9a47-11e8-b64d-95841ca0b247';

describe('visualize url generator', () => {
  test('creates a link to a new visualization', async () => {
    const locator = new MapsAppLocatorDefinition({
      useHash: false,
    });
    const location = await locator.getLocation({});

    expect(location).toMatchObject({
      app: 'maps',
      path: '/map#/?_g=()&_a=()',
      state: {},
    });
  });

  test('creates a link with global time range set up', async () => {
    const locator = new MapsAppLocatorDefinition({
      useHash: false,
    });
    const location = await locator.getLocation({
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
    });

    expect(location).toMatchObject({
      app: 'maps',
      path: '/map#/?_g=(time:(from:now-15m,mode:relative,to:now))&_a=()',
      state: {},
    });
  });

  test('creates a link with initialLayers set up', async () => {
    const locator = new MapsAppLocatorDefinition({
      useHash: false,
    });
    const initialLayers = [
      {
        id: LAYER_ID,
        visible: true,
        type: LAYER_TYPE.GEOJSON_VECTOR,
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
    const location = await locator.getLocation({
      initialLayers: initialLayers as unknown as LayerDescriptor[] & SerializableRecord,
    });

    expect(location).toMatchObject({
      app: 'maps',
      path: `/map#/?_g=()&_a=()&initialLayers=(id%3A'13823000-99b9-11ea-9eb6-d9e8adceb647'%2CsourceDescriptor%3A(geoField%3Atest%2Cid%3A'13823000-99b9-11ea-9eb6-d9e8adceb647'%2CindexPatternId%3A'90943e30-9a47-11e8-b64d-95841ca0b247'%2Clabel%3A'Sample%20Data'%2CscalingType%3ALIMIT%2CtooltipProperties%3A!()%2Ctype%3AES_SEARCH)%2Ctype%3AGEOJSON_VECTOR%2Cvisible%3A!t)`,
      state: {},
    });
  });

  test('creates a link with filters, time range, refresh interval and query to a saved visualization', async () => {
    const locator = new MapsAppLocatorDefinition({
      useHash: false,
    });
    const location = await locator.getLocation({
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

    expect(location).toMatchObject({
      app: 'maps',
      path: `/map#/${MAP_ID}?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,negate:!f),query:(query:q1))),refreshInterval:(pause:!f,value:300),time:(from:now-15m,mode:relative,to:now))&_a=(filters:!((meta:(alias:!n,disabled:!f,negate:!f),query:(query:q1))),query:(language:kuery,query:q2))`,
      state: {},
    });
  });
});
