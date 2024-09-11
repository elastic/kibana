/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRulesImportHelper } from './prebuilt_rules_import_helper';

const createPrebuiltRulesImportHelperMock = (): jest.Mocked<PrebuiltRulesImportHelper> =>
  ({
    setup: jest.fn(),
    fetchMatchingAssets: jest.fn(),
    fetchAssetRuleIds: jest.fn(),
  } as unknown as jest.Mocked<PrebuiltRulesImportHelper>);

export const prebuiltRulesImportHelperMock = {
  create: createPrebuiltRulesImportHelperMock,
};
