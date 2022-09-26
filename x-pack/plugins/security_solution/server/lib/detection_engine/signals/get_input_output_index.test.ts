/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { DEFAULT_INDEX_KEY, DEFAULT_INDEX_PATTERN } from '../../../../common/constants';
import type { GetInputIndex } from './get_input_output_index';
import { getInputIndex, DataViewError } from './get_input_output_index';

describe('get_input_output_index', () => {
  let servicesMock: RuleExecutorServicesMock;
  const logger: MockedLogger = loggerMock.create();

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
      ruleId: 'rule_1',
      logger,
    };
  });

  describe('getInputOutputIndex', () => {
    describe('data view is not defined', () => {
      test('Returns inputIndex if inputIndex is passed in', async () => {
        servicesMock.savedObjectsClient.get.mockImplementation(
          async (type: string, id: string) => ({
            id,
            type,
            references: [],
            attributes: {},
          })
        );
        const inputIndex = await getInputIndex(defaultProps);
        expect(inputIndex).toEqual({ index: ['test-input-index-1'], runtimeMappings: {} });
      });

      test('Returns a saved object inputIndex if passed in inputIndex is undefined', async () => {
        servicesMock.savedObjectsClient.get.mockImplementation(
          async (type: string, id: string) => ({
            id,
            type,
            references: [],
            attributes: {
              [DEFAULT_INDEX_KEY]: ['configured-index-1', 'configured-index-2'],
            },
          })
        );
        const inputIndex = await getInputIndex({
          ...defaultProps,
          index: undefined,
        });
        expect(inputIndex).toEqual({
          index: ['configured-index-1', 'configured-index-2'],
          runtimeMappings: {},
        });
      });

      test('Returns a saved object inputIndex if passed in inputIndex is null', async () => {
        servicesMock.savedObjectsClient.get.mockImplementation(
          async (type: string, id: string) => ({
            id,
            type,
            references: [],
            attributes: {
              [DEFAULT_INDEX_KEY]: ['configured-index-1', 'configured-index-2'],
            },
          })
        );
        const inputIndex = await getInputIndex({
          ...defaultProps,
          index: null,
        });
        expect(inputIndex).toEqual({
          index: ['configured-index-1', 'configured-index-2'],
          runtimeMappings: {},
        });
      });

      test('Returns a saved object inputIndex default from constants if inputIndex passed in is null and the key is also null', async () => {
        servicesMock.savedObjectsClient.get.mockImplementation(
          async (type: string, id: string) => ({
            id,
            type,
            references: [],
            attributes: {
              [DEFAULT_INDEX_KEY]: null,
            },
          })
        );
        const inputIndex = await getInputIndex({
          ...defaultProps,
          index: null,
        });
        expect(inputIndex).toEqual({ index: DEFAULT_INDEX_PATTERN, runtimeMappings: {} });
      });

      test('Returns a saved object inputIndex default from constants if inputIndex passed in is undefined and the key is also null', async () => {
        servicesMock.savedObjectsClient.get.mockImplementation(
          async (type: string, id: string) => ({
            id,
            type,
            references: [],
            attributes: {
              [DEFAULT_INDEX_KEY]: null,
            },
          })
        );
        const inputIndex = await getInputIndex({
          ...defaultProps,
          index: undefined,
        });
        expect(inputIndex).toEqual({ index: DEFAULT_INDEX_PATTERN, runtimeMappings: {} });
      });

      test('Returns a saved object inputIndex default from constants if both passed in inputIndex and configuration attributes are missing and the index is undefined', async () => {
        const inputIndex = await getInputIndex({
          ...defaultProps,
          index: undefined,
        });
        expect(inputIndex).toEqual({ index: DEFAULT_INDEX_PATTERN, runtimeMappings: {} });
      });

      test('Returns a saved object inputIndex default from constants if both passed in inputIndex and configuration attributes are missing and the index is null', async () => {
        const inputIndex = await getInputIndex({
          ...defaultProps,
          index: null,
        });
        expect(inputIndex).toEqual({ index: DEFAULT_INDEX_PATTERN, runtimeMappings: {} });
      });
    });
  });

  describe('data view is defined', () => {
    test('Returns data view indices and runtime mappings if data view is found', async () => {
      servicesMock.savedObjectsClient.get.mockImplementation(async (type: string, id: string) => ({
        id: '12345',
        type,
        references: [],
        attributes: {
          title: 'test-*,foo-*,bar-*',
          runtimeFieldMap: '{"test-runtime":{"type":"keyword"}}',
        },
      }));
      const inputIndex = await getInputIndex({
        services: servicesMock,
        version: '8.0.0',
        index: ['test-*'],
        ruleId: 'rule_1',
        logger,
        dataViewId: '12345',
      });
      expect(inputIndex).toEqual({
        index: ['test-*', 'foo-*', 'bar-*'],
        runtimeMappings: { 'test-runtime': { type: 'keyword' } },
      });
    });

    test('Returns error if no matching data view found', async () => {
      servicesMock.savedObjectsClient.get.mockRejectedValue(
        new Error('Saved object [index-pattern/12345] not found')
      );
      await expect(
        getInputIndex({
          services: servicesMock,
          version: '8.0.0',
          index: [],
          dataViewId: '12345',
          ruleId: 'rule_1',
          logger,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Saved object [index-pattern/12345] not found"`
      );
    });

    test('Returns error of DataViewErrorType', async () => {
      servicesMock.savedObjectsClient.get.mockRejectedValue(
        new Error('Saved object [index-pattern/12345] not found')
      );
      await expect(
        getInputIndex({
          services: servicesMock,
          version: '8.0.0',
          index: [],
          dataViewId: '12345',
          ruleId: 'rule_1',
          logger,
        })
      ).rejects.toBeInstanceOf(DataViewError);
    });
  });
});
