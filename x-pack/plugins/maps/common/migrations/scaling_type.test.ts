/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { migrateUseTopHitsToScalingType } from './scaling_type';

describe('migrateUseTopHitsToScalingType', () => {
  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(migrateUseTopHitsToScalingType({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('Should migrate useTopHits: true to scalingType TOP_HITS for ES documents sources', () => {
    const layerListJSON = JSON.stringify([
      {
        sourceDescriptor: {
          type: 'ES_SEARCH',
          useTopHits: true,
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(migrateUseTopHitsToScalingType({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: '[{"sourceDescriptor":{"type":"ES_SEARCH","scalingType":"TOP_HITS"}}]',
    });
  });

  test('Should migrate useTopHits: false to scalingType LIMIT for ES documents sources', () => {
    const layerListJSON = JSON.stringify([
      {
        sourceDescriptor: {
          type: 'ES_SEARCH',
          useTopHits: false,
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(migrateUseTopHitsToScalingType({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: '[{"sourceDescriptor":{"type":"ES_SEARCH","scalingType":"LIMIT"}}]',
    });
  });

  test('Should set scalingType to LIMIT when useTopHits is not set', () => {
    const layerListJSON = JSON.stringify([
      {
        sourceDescriptor: {
          type: 'ES_SEARCH',
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(migrateUseTopHitsToScalingType({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: '[{"sourceDescriptor":{"type":"ES_SEARCH","scalingType":"LIMIT"}}]',
    });
  });
});
