/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SortColumnTimeline } from '../../../common';
import { tGridDefaults } from './defaults';
import { setInitializeTgridSettings } from './helpers';
import { mockGlobalState } from '../../mock/global_state';

import { TGridModelSettings } from '.';

const id = 'foo';
const timelineById = {
  ...mockGlobalState.timelineById,
};

describe('setInitializeTgridSettings', () => {
  test('it returns the expected sort when tGridSettingsProps has an override', () => {
    const sort: SortColumnTimeline[] = [
      { columnId: 'foozle', columnType: 'date', sortDirection: 'asc' },
    ];

    const tGridSettingsProps: Partial<TGridModelSettings> = {
      footerText: 'test',
      sort, // <-- override
    };

    expect(setInitializeTgridSettings({ id, timelineById, tGridSettingsProps })[id].sort).toEqual(
      sort
    );
  });

  test('it returns the default sort when tGridSettingsProps does NOT contain an override', () => {
    const tGridSettingsProps = { footerText: 'test' }; // <-- no `sort` override

    expect(setInitializeTgridSettings({ id, timelineById, tGridSettingsProps })[id].sort).toEqual(
      tGridDefaults.sort
    );
  });
});
