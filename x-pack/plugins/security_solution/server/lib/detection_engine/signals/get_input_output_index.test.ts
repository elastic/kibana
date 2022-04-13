/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsMock, RuleExecutorServicesMock } from '../../../../../alerting/server/mocks';
import { DEFAULT_INDEX_KEY, DEFAULT_INDEX_PATTERN } from '../../../../common/constants';
import { getInputIndex, GetInputIndex } from './get_input_output_index';
import { allowedExperimentalValues } from '../../../../common/experimental_features';

describe('get_input_output_index', () => {
  let servicesMock: RuleExecutorServicesMock;

  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });
  let defaultProps: GetInputIndex;
  beforeEach(() => {
    servicesMock = alertsMock.createRuleExecutorServices();
    servicesMock.savedObjectsClient.get.mockImplementation(async (type: string, id: string) => ({
      id,
      type,
      references: [],
      attributes: {},
    }));
    defaultProps = {
      services: servicesMock,
      version: '8.0.0',
      index: ['test-input-index-1'],
      experimentalFeatures: {
        ...allowedExperimentalValues,
      },
    };
  });

  describe('getInputOutputIndex', () => {
    test('Returns inputIndex if inputIndex is passed in', async () => {
      servicesMock.savedObjectsClient.get.mockImplementation(async (type: string, id: string) => ({
        id,
        type,
        references: [],
        attributes: {},
      }));
      const inputIndex = await getInputIndex(defaultProps);
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
      const inputIndex = await getInputIndex({
        ...defaultProps,
        index: undefined,
      });
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
      const inputIndex = await getInputIndex({
        ...defaultProps,
        index: null,
      });
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
      const inputIndex = await getInputIndex({
        ...defaultProps,
        index: null,
      });
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
      const inputIndex = await getInputIndex({
        ...defaultProps,
        index: undefined,
      });
      expect(inputIndex).toEqual(DEFAULT_INDEX_PATTERN);
    });

    test('Returns a saved object inputIndex default from constants if both passed in inputIndex and configuration attributes are missing and the index is undefined', async () => {
      const inputIndex = await getInputIndex({
        ...defaultProps,
        index: undefined,
      });
      expect(inputIndex).toEqual(DEFAULT_INDEX_PATTERN);
    });

    test('Returns a saved object inputIndex default from constants if both passed in inputIndex and configuration attributes are missing and the index is null', async () => {
      const inputIndex = await getInputIndex({
        ...defaultProps,
        index: null,
      });
      expect(inputIndex).toEqual(DEFAULT_INDEX_PATTERN);
    });
  });
});
