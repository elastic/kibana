/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDetectionRulesClient } from '../detection_rules_client_interface';

export type DetectionRulesClientMock = jest.Mocked<IDetectionRulesClient>;

const createDetectionRulesClientMock = () => {
  const mocked: DetectionRulesClientMock = {
    createCustomRule: jest.fn(),
    createPrebuiltRule: jest.fn(),
    updateRule: jest.fn(),
    patchRule: jest.fn(),
    deleteRule: jest.fn(),
    upgradePrebuiltRule: jest.fn(),
    importRule: jest.fn(),
  };
  return mocked;
};

export const detectionRulesClientMock: {
  create: () => DetectionRulesClientMock;
} = {
  create: createDetectionRulesClientMock,
};
