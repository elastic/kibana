/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test/jest';

import { ApiTokenTypes } from '../credentials/constants';

import { EngineTypes } from './types';

import { EngineLogic } from './';

describe('EngineLogic', () => {
  const { mount } = new LogicMounter(EngineLogic);
  const { http } = mockHttpValues;

  const mockEngineData = {
    name: 'some-engine',
    type: EngineTypes.default,
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
    hasSchemaErrors: false,
    hasSchemaConflicts: false,
    hasUnconfirmedSchemaFields: false,
    engineNotFound: false,
    searchKey: '',
  };

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
  });

  describe('listeners', () => {
    describe('initializeEngine', () => {
      it('fetches and sets engine data', async () => {
        mount({ engineName: 'some-engine' });
        jest.spyOn(EngineLogic.actions, 'setEngineData');
        http.get.mockReturnValueOnce(Promise.resolve(mockEngineData));

        EngineLogic.actions.initializeEngine();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/api/app_search/engines/some-engine');
        expect(EngineLogic.actions.setEngineData).toHaveBeenCalledWith(mockEngineData);
      });

      it('handles errors', async () => {
        mount();
        jest.spyOn(EngineLogic.actions, 'setEngineNotFound');
        http.get.mockReturnValue(Promise.reject('An error occured'));

        EngineLogic.actions.initializeEngine();
        await nextTick();

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
        const mockMetaEngine = { ...mockEngineData, type: EngineTypes.meta };
        mount({ engine: mockMetaEngine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES,
          engine: mockMetaEngine,
          isMetaEngine: true,
        });
      });
    });

    describe('hasSchemaErrors', () => {
      it('should be set based on engine.activeReindexJob.numDocumentsWithErrors', () => {
        const mockSchemaEngine = {
          ...mockEngineData,
          activeReindexJob: {
            numDocumentsWithErrors: 10,
          },
        };
        mount({ engine: mockSchemaEngine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES,
          engine: mockSchemaEngine,
          hasSchemaErrors: true,
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

    describe('searchKey', () => {
      it('should select the first available search key for this engine', () => {
        const engine = {
          ...mockEngineData,
          apiTokens: [
            {
              key: 'private-123xyz',
              name: 'privateKey',
              type: ApiTokenTypes.Private,
            },
            {
              key: 'search-123xyz',
              name: 'searchKey',
              type: ApiTokenTypes.Search,
            },
            {
              key: 'search-8910abc',
              name: 'searchKey2',
              type: ApiTokenTypes.Search,
            },
          ],
        };
        mount({ engine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES,
          engine,
          searchKey: 'search-123xyz',
        });
      });

      it('should return an empty string if none are available', () => {
        const engine = {
          ...mockEngineData,
          apiTokens: [
            {
              key: 'private-123xyz',
              name: 'privateKey',
              type: ApiTokenTypes.Private,
            },
          ],
        };
        mount({ engine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES,
          engine,
          searchKey: '',
        });
      });
    });
  });
});
