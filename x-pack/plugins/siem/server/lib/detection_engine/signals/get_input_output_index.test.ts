/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { alertsMock, AlertServicesMock } from '../../../../../alerts/server/mocks';
import { DEFAULT_INDEX_KEY, DEFAULT_INDEX_PATTERN } from '../../../../common/constants';
import { getInputIndex } from './get_input_output_index';

describe('get_input_output_index', () => {
  let servicesMock: AlertServicesMock;

  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    servicesMock = alertsMock.createAlertServices();
    servicesMock.savedObjectsClient.get.mockImplementation(async (type: string, id: string) => ({
      id,
      type,
      references: [],
      attributes: {},
    }));
  });

  describe('getInputOutputIndex', () => {
    test('Returns inputIndex if inputIndex is passed in', async () => {
      servicesMock.savedObjectsClient.get.mockImplementation(async (type: string, id: string) => ({
        id,
        type,
        references: [],
        attributes: {},
      }));
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', ['test-input-index-1']);
      expect(inputIndex).toEqual(['test-input-index-1']);
    });

    test('Returns a saved object inputIndex if passed in inputIndex is undefined', async () => {
      servicesMock.savedObjectsClient.get.mockImplementation(async (type: string, id: string) => ({
        id,
        type,
        references: [],
        attributes: {
          [DEFAULT_INDEX_KEY]: ['configured-index-1', 'configured-index-2'],
        },
      }));
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', undefined);
      expect(inputIndex).toEqual(['configured-index-1', 'configured-index-2']);
    });

    test('Returns a saved object inputIndex if passed in inputIndex is null', async () => {
      servicesMock.savedObjectsClient.get.mockImplementation(async (type: string, id: string) => ({
        id,
        type,
        references: [],
        attributes: {
          [DEFAULT_INDEX_KEY]: ['configured-index-1', 'configured-index-2'],
        },
      }));
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', null);
      expect(inputIndex).toEqual(['configured-index-1', 'configured-index-2']);
    });

    test('Returns a saved object inputIndex default from constants if inputIndex passed in is null and the key is also null', async () => {
      servicesMock.savedObjectsClient.get.mockImplementation(async (type: string, id: string) => ({
        id,
        type,
        references: [],
        attributes: {
          [DEFAULT_INDEX_KEY]: null,
        },
      }));
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', null);
      expect(inputIndex).toEqual(DEFAULT_INDEX_PATTERN);
    });

    test('Returns a saved object inputIndex default from constants if inputIndex passed in is undefined and the key is also null', async () => {
      servicesMock.savedObjectsClient.get.mockImplementation(async (type: string, id: string) => ({
        id,
        type,
        references: [],
        attributes: {
          [DEFAULT_INDEX_KEY]: null,
        },
      }));
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', undefined);
      expect(inputIndex).toEqual(DEFAULT_INDEX_PATTERN);
    });

    test('Returns a saved object inputIndex default from constants if both passed in inputIndex and configuration attributes are missing and the index is undefined', async () => {
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', undefined);
      expect(inputIndex).toEqual(DEFAULT_INDEX_PATTERN);
    });

    test('Returns a saved object inputIndex default from constants if both passed in inputIndex and configuration attributes are missing and the index is null', async () => {
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', null);
      expect(inputIndex).toEqual(DEFAULT_INDEX_PATTERN);
    });
  });
});
