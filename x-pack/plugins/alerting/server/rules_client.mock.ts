/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClientApi } from './types';

type Schema = RulesClientApi;
export type RulesClientMock = jest.Mocked<Schema>;

const createRulesClientMock = () => {
  const mocked: RulesClientMock = {
    aggregate: jest.fn(),
    create: jest.fn(),
    get: jest.fn(),
    resolve: jest.fn(),
    getAlertState: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    updateApiKey: jest.fn(),
    muteAll: jest.fn(),
    unmuteAll: jest.fn(),
    muteInstance: jest.fn(),
    unmuteInstance: jest.fn(),
    listAlertTypes: jest.fn(),
    getAlertSummary: jest.fn(),
    getExecutionLogForRule: jest.fn(),
    getRuleExecutionKPI: jest.fn(),
    getGlobalExecutionKpiWithAuth: jest.fn(),
    getGlobalExecutionLogWithAuth: jest.fn(),
    getActionErrorLog: jest.fn(),
    getSpaceId: jest.fn(),
    bulkEdit: jest.fn(),
    snooze: jest.fn(),
    unsnooze: jest.fn(),
    calculateIsSnoozedUntil: jest.fn(),
    clearExpiredSnoozes: jest.fn(),
    runSoon: jest.fn(),
  };
  return mocked;
};

export const rulesClientMock: {
  create: () => RulesClientMock;
} = {
  create: createRulesClientMock,
};
