/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSourceImporter } from './rule_source_importer';

const createRuleSourceImporterMock = (): jest.Mocked<RuleSourceImporter> =>
  ({
    setup: jest.fn(),
    calculateRuleSource: jest.fn(),
    isPrebuiltRule: jest.fn(),
  } as unknown as jest.Mocked<RuleSourceImporter>);

export const ruleSourceImporterMock = {
  create: createRuleSourceImporterMock,
};
