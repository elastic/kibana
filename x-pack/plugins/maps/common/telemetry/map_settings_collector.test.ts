/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import mapSavedObjects from './test_resources/sample_map_saved_objects.json';
import { MapSettingsCollector } from './map_settings_collector';
import { MapSettings } from '../descriptor_types';

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
  },
];

const testsToRun = mapSavedObjects.map(({ attributes }, index: number) => {
  const mapState = JSON.parse(attributes.mapStateJSON);
  const mapSettings: Partial<MapSettings> = mapState.settings;
  return [mapSettings, expecteds[index]] as const;
});

describe.each(testsToRun)('MapSettingsCollector %#', (mapSettings, expected) => {
  const statsCollector = new MapSettingsCollector(mapSettings);
  test('getCustomIconsCount', () => {
    expect(statsCollector.getCustomIconsCount()).toBe(expected.customIconsCount);
  });
});
