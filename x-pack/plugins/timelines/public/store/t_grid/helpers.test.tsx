/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setInitializeTgridSettings } from './helpers';
import { mockGlobalState } from '../../mock/global_state';

const id = 'foo';
const defaultTimelineById = {
  ...mockGlobalState.timelineById,
};

describe('setInitializeTgridSettings', () => {
  test('it doesn`t overwrite the timeline if it is initialized', () => {
    const tGridSettingsProps = { title: 'testTitle' };

    const timelineById = {
      [id]: {
        ...defaultTimelineById.test,
        initialized: true,
      },
    };

    const result = setInitializeTgridSettings({ id, timelineById, tGridSettingsProps });
    expect(result).toBe(timelineById);
  });
});
