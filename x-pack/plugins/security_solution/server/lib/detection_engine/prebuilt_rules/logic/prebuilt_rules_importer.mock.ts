/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRulesImporter } from './prebuilt_rules_importer';

const createPrebuiltRulesImporterMock = (): jest.Mocked<PrebuiltRulesImporter> =>
  ({
    setup: jest.fn(),
    fetchPrebuiltRuleAssets: jest.fn(),
  } as unknown as jest.Mocked<PrebuiltRulesImporter>);

export const prebuiltRulesImporterMock = {
  create: createPrebuiltRulesImporterMock,
};
