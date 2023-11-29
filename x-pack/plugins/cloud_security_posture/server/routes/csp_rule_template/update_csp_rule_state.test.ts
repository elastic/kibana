/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import {
  setRulesStates,
  createCspSettingObject,
  getCspSettingObjectSafe,
} from './update_csp_rule_state';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import {
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
} from '@kbn/cloud-security-posture-plugin/common/constants';

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';

describe('CSP Rule State Management', () => {
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;
  let mockLogger: Logger;

  beforeEach(() => {
    mockSoClient = savedObjectsClientMock.create();
    mockLogger = coreMock.createPluginInitializerContext().logger.get();

    jest.clearAllMocks();
  });

  it('should create a new CSP setting object', async () => {
    await createCspSettingObject(mockSoClient);

    expect(mockSoClient.create).toHaveBeenCalledWith(
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
      {
        rules_states: {},
      },
      { id: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID }
    );
  });

  it('should set rules states correctly', () => {
    const currentRulesStates = {
      rule1: { muted: false },
      rule2: { muted: true },
    };

    const ruleIds = ['rule1', 'rule3'];
    const newState = true;

    const updatedRulesStates = setRulesStates(currentRulesStates, ruleIds, newState);

    expect(updatedRulesStates).toEqual({
      rule1: { muted: true },
      rule2: { muted: true },
      rule3: { muted: true },
    });
  });

  it('should get CSP settings safely when settings already exists', async () => {
    const mockExistingCspSettings = {
      id: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
      type: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        rules_states: { rule1: { muted: false } },
      },
    };

    mockSoClient.get.mockResolvedValueOnce(mockExistingCspSettings);

    const result = await getCspSettingObjectSafe(mockSoClient, mockLogger);

    expect(result).toEqual({
      rules_states: { rule1: { muted: false } },
    });
  });

  it('should handle error when fetching CSP settings safely', async () => {
    const mockError = { message: 'Not Found', statsCode: 404 };

    mockSoClient.get.mockRejectedValueOnce(mockError);

    mockSoClient.create.mockResolvedValueOnce({
      id: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
      type: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        rules_states: {},
      },
    });

    const result = await getCspSettingObjectSafe(mockSoClient, mockLogger);

    expect(mockSoClient.get).toHaveBeenCalledWith(
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID
    );

    expect(mockSoClient.create).toHaveBeenCalledWith(
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
      {
        rules_states: {},
      },
      { id: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID }
    );

    expect(result).toEqual({
      rules_states: {},
    });
  });
});
