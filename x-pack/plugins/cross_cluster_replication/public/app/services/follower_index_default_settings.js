/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FOLLOWER_INDEX_ADVANCED_SETTINGS } from '../../../common/constants';

export const getSettingDefault = (name) => {
  if (!FOLLOWER_INDEX_ADVANCED_SETTINGS[name]) {
    throw new Error(`Unknown setting ${name}`);
  }

  return FOLLOWER_INDEX_ADVANCED_SETTINGS[name];
};

export const isSettingDefault = (name, value) => {
  return getSettingDefault(name) === value;
};

export const areAllSettingsDefault = (settings) => {
  return Object.keys(FOLLOWER_INDEX_ADVANCED_SETTINGS).every((name) =>
    isSettingDefault(name, settings[name])
  );
};
