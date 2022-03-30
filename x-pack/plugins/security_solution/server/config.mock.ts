/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SIGNALS_INDEX, SIGNALS_INDEX_KEY } from '../common/constants';
import {
  ExperimentalFeatures,
  parseExperimentalConfigValue,
} from '../common/experimental_features';
import { ConfigType } from './config';

export const createMockConfig = (): ConfigType => {
  const enableExperimental: string[] = [];

  return {
    [SIGNALS_INDEX_KEY]: DEFAULT_SIGNALS_INDEX,
    maxRuleImportExportSize: 10000,
    maxRuleImportPayloadBytes: 10485760,
    maxTimelineImportExportSize: 10000,
    maxTimelineImportPayloadBytes: 10485760,
    enableExperimental,
    packagerTaskInterval: '60s',
    alertMergeStrategy: 'missingFields',
    alertIgnoreFields: [],
    prebuiltRulesFromFileSystem: true,
    prebuiltRulesFromSavedObjects: false,

    experimentalFeatures: parseExperimentalConfigValue(enableExperimental),
  };
};

const withExperimentalFeature = (
  config: ConfigType,
  feature: keyof ExperimentalFeatures
): ConfigType => {
  const enableExperimental = config.enableExperimental.concat(feature);
  return {
    ...config,
    enableExperimental,
    experimentalFeatures: parseExperimentalConfigValue(enableExperimental),
  };
};

export const configMock = {
  createDefault: createMockConfig,
  withExperimentalFeature,
};
