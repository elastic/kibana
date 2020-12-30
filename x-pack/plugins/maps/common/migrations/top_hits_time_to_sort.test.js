/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { topHitsTimeToSort } from './top_hits_time_to_sort';

describe('topHitsTimeToSort', () => {
  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(topHitsTimeToSort({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('Should move topHitsTimeField to sortField for ES documents sources', () => {
    const layerListJSON = JSON.stringify([
      {
        sourceDescriptor: {
          type: 'ES_SEARCH',
          topHitsSplitField: 'gpsId',
          topHitsTimeField: '@timestamp',
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(topHitsTimeToSort({ attributes })).toEqual({
      title: 'my map',
      layerListJSON:
        '[{"sourceDescriptor":{"type":"ES_SEARCH","topHitsSplitField":"gpsId","sortField":"@timestamp","sortOrder":"desc"}}]',
    });
  });

  test('Should handle ES documents sources without topHitsTimeField', () => {
    const layerListJSON = JSON.stringify([
      {
        sourceDescriptor: {
          type: 'ES_SEARCH',
          topHitsSplitField: 'gpsId',
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(topHitsTimeToSort({ attributes })).toEqual({
      title: 'my map',
      layerListJSON,
    });
  });
});
