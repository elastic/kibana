/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import mapSavedObjects from './test_resources/sample_map_saved_objects.json';
import { MapSettingsCollector } from './map_settings_collector';
import { MapSavedObjectAttributes } from '../map_saved_object_type';

const expecteds = [
  {
    customIconsCount: 0,
  },
  {
    customIconsCount: 0,
  },
  {
    customIconsCount: 0,
  },
  {
    customIconsCount: 1,
  },
  {
    customIconsCount: 3,
    autoFitToDataBounds: true,
  },
];

const testsToRun = mapSavedObjects.map(
  (savedObject: { attributes: MapSavedObjectAttributes }, index: number) => {
    const { attributes } = savedObject;
    return [attributes, expecteds[index]] as const;
  }
);

describe.each(testsToRun)('MapSettingsCollector %#', (attributes, expected) => {
  const statsCollector = new MapSettingsCollector(attributes);
  test('getCustomIconsCount', () => {
    expect(statsCollector.getCustomIconsCount()).toBe(expected.customIconsCount);
  });
});
