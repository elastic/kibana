/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FLAPPING_SETTINGS, DEFAULT_QUERY_DELAY_SETTINGS } from '../types';

const createRulesSettingsServiceMock = () => {
  return jest.fn().mockImplementation(() => {
    return {
      getSettings: jest.fn().mockReturnValue({
        queryDelaySettings: DEFAULT_QUERY_DELAY_SETTINGS,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      }),
    };
  });
};

export const rulesSettingsServiceMock = {
  create: createRulesSettingsServiceMock(),
};
