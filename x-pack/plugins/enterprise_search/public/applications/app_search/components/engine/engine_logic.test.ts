/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogicMounter } from '../../../__mocks__/kea.mock';

import { mockHttpValues } from '../../../__mocks__';
jest.mock('../../../shared/http', () => ({
  HttpLogic: { values: mockHttpValues },
}));
const { http } = mockHttpValues;

import { EngineLogic } from './';

describe('EngineLogic', () => {
  const mockEngineData = {
    name: 'some-engine',
    type: 'default',
    created_at: 'some date timestamp',
    language: null,
    document_count: 1,
    field_count: 1,
    result_fields: {
      id: { raw: {} },
    },
    unconfirmedFields: [],
    unsearchedUnconfirmedFields: false,
    sample: false,
    isMeta: false,
    invalidBoosts: false,
    schema: {},
    apiTokens: [],
    apiKey: 'some-key',
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    engine: {},
    engineName: '',
    isMetaEngine: false,
    isSampleEngine: false,
    hasSchemaConflicts: false,
    hasUnconfirmedSchemaFields: false,
    engineNotFound: false,
  };

  const { mount } = new LogicMounter(EngineLogic);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(EngineLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setEngineData', () => {
      describe('engine & dataLoading', () => {
        it('should set engine to the provided value and dataLoading to false', () => {
          mount();
          EngineLogic.actions.setEngineData(mockEngineData);

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engine: mockEngineData,
            dataLoading: false,
          });
        });
      });
    });

    describe('setEngineName', () => {
      describe('engineName', () => {
        it('should be set to the provided value', () => {
          mount();
          EngineLogic.actions.setEngineName('some-new-engine');

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engineName: 'some-new-engine',
          });
        });
      });
    });

    describe('setIndexingStatus', () => {
      describe('engine', () => {
        it('should set the nested obj property to the provided value', () => {
          mount({ engine: mockEngineData });
          const mockReindexJob = {
            percentageComplete: 50,
            numDocumentsWithErrors: 2,
            activeReindexJobId: 123,
          };
          EngineLogic.actions.setIndexingStatus(mockReindexJob);

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engine: {
              ...mockEngineData,
              activeReindexJob: mockReindexJob,
            },
          });
        });
      });
    });

    describe('setEngineNotFound', () => {
      describe('engineNotFound', () => {
        it('should be set to the provided value', () => {
          mount();
          EngineLogic.actions.setEngineNotFound(true);

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engineNotFound: true,
          });
        });
      });
    });

    describe('clearEngine', () => {
      describe('engine', () => {
        it('should be reset to an empty obj', () => {
          mount({ engine: mockEngineData });
          EngineLogic.actions.clearEngine();

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engine: {},
          });
        });
      });

      describe('engineName', () => {
        it('should be reset to an empty string', () => {
          mount({ engineName: 'hello-world' });
          EngineLogic.actions.clearEngine();

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engineName: '',
          });
        });
      });

      describe('dataLoading', () => {
        it('should be set to true', () => {
          mount({ dataLoading: false });
          EngineLogic.actions.clearEngine();

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            dataLoading: true,
          });
        });
      });

      describe('engineNotFound', () => {
        it('should be set to false', () => {
          mount({ engineNotFound: true });
          EngineLogic.actions.clearEngine();

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engineNotFound: false,
          });
        });
      });
    });

    describe('initializeEngine', () => {
      it('fetches and sets engine data', async () => {
        mount({ engineName: 'some-engine' });
        jest.spyOn(EngineLogic.actions, 'setEngineData');
        const promise = Promise.resolve(mockEngineData);
        http.get.mockReturnValueOnce(promise);

        EngineLogic.actions.initializeEngine();
        await promise;

        expect(http.get).toHaveBeenCalledWith('/api/app_search/engines/some-engine');
        expect(EngineLogic.actions.setEngineData).toHaveBeenCalledWith(mockEngineData);
      });

      it('handles errors', async () => {
        mount();
        jest.spyOn(EngineLogic.actions, 'setEngineNotFound');
        const promise = Promise.reject('An error occured');
        http.get.mockReturnValue(promise);

        try {
          EngineLogic.actions.initializeEngine();
          await promise;
        } catch {
          // Do nothing
        }
        expect(EngineLogic.actions.setEngineNotFound).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('selectors', () => {
    describe('isSampleEngine', () => {
      it('should be set based on engine.sample', () => {
        const mockSampleEngine = { ...mockEngineData, sample: true };
        mount({ engine: mockSampleEngine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES,
          engine: mockSampleEngine,
          isSampleEngine: true,
        });
      });
    });

    describe('isMetaEngine', () => {
      it('should be set based on engine.type', () => {
        const mockMetaEngine = { ...mockEngineData, type: 'meta' };
        mount({ engine: mockMetaEngine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES,
          engine: mockMetaEngine,
          isMetaEngine: true,
        });
      });
    });

    describe('hasSchemaConflicts', () => {
      it('should be set based on engine.schemaConflicts', () => {
        const mockSchemaEngine = {
          ...mockEngineData,
          schemaConflicts: {
            someSchemaField: {
              fieldTypes: {
                number: ['some-engine'],
                date: ['another-engine'],
              },
            },
          },
        };
        mount({ engine: mockSchemaEngine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES,
          engine: mockSchemaEngine,
          hasSchemaConflicts: true,
        });
      });
    });

    describe('hasUnconfirmedSchemaFields', () => {
      it('should be set based on engine.unconfirmedFields', () => {
        const mockUnconfirmedFieldsEngine = {
          ...mockEngineData,
          unconfirmedFields: ['new_field_1', 'new_field_2'],
        };
        mount({ engine: mockUnconfirmedFieldsEngine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES,
          engine: mockUnconfirmedFieldsEngine,
          hasUnconfirmedSchemaFields: true,
        });
      });
    });
  });
});
