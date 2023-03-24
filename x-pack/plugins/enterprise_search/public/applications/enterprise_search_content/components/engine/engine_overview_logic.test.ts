/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Status } from '../../../../../common/types/api';
import { EnterpriseSearchEngineIndex } from '../../../../../common/types/engines';

import {
  EngineOverviewLogic,
  EngineOverviewValues,
  selectDocumentsCount,
  selectFieldsCount,
  selectHasUnknownIndices,
  selectIndices,
  selectIndicesCount,
} from './engine_overview_logic';

const DEFAULT_VALUES: EngineOverviewValues = {
  documentsCount: 0,
  engineData: undefined,
  engineFieldCapabilitiesApiStatus: Status.IDLE,
  engineFieldCapabilitiesData: undefined,
  engineName: '',
  fieldsCount: 0,
  hasUnknownIndices: false,
  indices: [],
  indicesCount: 0,
  isLoadingEngine: true,
};

describe('EngineOverviewLogic', () => {
  const { mount } = new LogicMounter(EngineOverviewLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mount();
  });

  it('has expected default values', () => {
    expect(EngineOverviewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('listeners', () => {
    describe('setEngineName', () => {
      it('refetches the engine field capabilities', () => {
        jest.spyOn(EngineOverviewLogic.actions, 'fetchEngineFieldCapabilities');

        EngineOverviewLogic.actions.setEngineName('foobar');

        expect(EngineOverviewLogic.actions.fetchEngineFieldCapabilities).toHaveBeenCalledTimes(1);
        expect(EngineOverviewLogic.actions.fetchEngineFieldCapabilities).toHaveBeenCalledWith({
          engineName: 'foobar',
        });
      });
    });
  });

  describe('selectors', () => {
    describe('indices', () => {
      it('is defined', () => {
        expect(selectIndices).toBeDefined();
      });
      it('returns an empty array before engineData is loaded', () => {
        expect(selectIndices(undefined)).toEqual([]);
      });
      it('returns the array of indices', () => {
        const indices = [
          {
            count: 10,
            health: 'green',
            name: 'index-001',
          },
          {
            count: 10,
            health: 'green',
            name: 'index-002',
          },
        ];
        const engineData = {
          indices,
          name: 'foo-engine',
          updated_at_millis: 2202018295,
        } as EngineOverviewValues['engineData'];
        expect(selectIndices(engineData)).toBe(indices);
      });
    });
    describe('indicesCount', () => {
      it('is defined', () => {
        expect(selectIndicesCount).toBeDefined();
      });
      it('returns the number of indices', () => {
        const noIndices: EnterpriseSearchEngineIndex[] = [];
        const oneIndex = [
          { count: 23, health: 'unknown', name: 'index-001' },
        ] as EnterpriseSearchEngineIndex[];
        const twoIndices = [
          { count: 23, health: 'unknown', name: 'index-001' },
          { count: 92, health: 'unknown', name: 'index-002' },
        ] as EnterpriseSearchEngineIndex[];

        expect(selectIndicesCount(noIndices)).toBe(0);
        expect(selectIndicesCount(oneIndex)).toBe(1);
        expect(selectIndicesCount(twoIndices)).toBe(2);
      });
    });

    describe('hasUnknownIndices', () => {
      it('is defined', () => {
        expect(selectHasUnknownIndices).toBeDefined();
      });
      describe('no indices', () => {
        const indices: EnterpriseSearchEngineIndex[] = [];
        it('returns false', () => {
          expect(selectHasUnknownIndices(indices)).toBe(false);
        });
      });
      describe('all indices unknown', () => {
        const indices = [
          {
            count: 12,
            health: 'unknown',
            name: 'index-001',
          },
          {
            count: 34,
            health: 'unknown',
            name: 'index-002',
          },
          {
            count: 56,
            health: 'unknown',
            name: 'index-003',
          },
        ] as EnterpriseSearchEngineIndex[];
        it('returns true', () => {
          expect(selectHasUnknownIndices(indices)).toBe(true);
        });
      });

      describe('one index unknown', () => {
        const indices = [
          {
            count: 12,
            health: 'unknown',
            name: 'index-001',
          },
          {
            count: 34,
            health: 'yellow',
            name: 'index-002',
          },
          {
            count: 56,
            health: 'green',
            name: 'index-003',
          },
        ] as EnterpriseSearchEngineIndex[];
        it('returns true', () => {
          expect(selectHasUnknownIndices(indices)).toBe(true);
        });
      });

      describe('multiple but not all indices unknown', () => {
        const indices = [
          {
            count: 12,
            health: 'unknown',
            name: 'index-001',
          },
          {
            count: 34,
            health: 'yellow',
            name: 'index-002',
          },
          {
            count: 56,
            health: 'unknown',
            name: 'index-003',
          },
        ] as EnterpriseSearchEngineIndex[];
        it('returns true', () => {
          expect(selectHasUnknownIndices(indices)).toBe(true);
        });
      });

      describe('no indices unknown', () => {
        const indices = [
          {
            count: 12,
            health: 'green',
            name: 'index-001',
          },
          {
            count: 34,
            health: 'yellow',
            name: 'index-002',
          },
          {
            count: 56,
            health: 'green',
            name: 'index-003',
          },
        ] as EnterpriseSearchEngineIndex[];
        it('returns false', () => {
          expect(selectHasUnknownIndices(indices)).toBe(false);
        });
      });
    });

    describe('documentsCount', () => {
      it('is defined', () => {
        expect(selectDocumentsCount).toBeDefined();
      });

      it('returns 0 for no indices', () => {
        expect(selectDocumentsCount([])).toBe(0);
      });

      it('returns the `count` for a single index', () => {
        expect(
          selectDocumentsCount([
            {
              count: 23,
              health: 'green',
              name: 'index-001',
            },
          ] as EnterpriseSearchEngineIndex[])
        ).toBe(23);
      });

      it('returns the sum of all `count`', () => {
        expect(
          selectDocumentsCount([
            {
              count: 23,
              health: 'green',
              name: 'index-001',
            },
            {
              count: 45,
              health: 'green',
              name: 'index-002',
            },
          ] as EnterpriseSearchEngineIndex[])
        ).toBe(68);
      });

      it('does not count indices without a `count`', () => {
        expect(
          selectDocumentsCount([
            {
              count: 23,
              health: 'green',
              name: 'index-001',
            },
            {
              count: null,
              health: 'unknown',
              name: 'index-002',
            },
            {
              count: 45,
              health: 'green',
              name: 'index-002',
            },
          ] as EnterpriseSearchEngineIndex[])
        ).toBe(68);
      });
    });

    describe('fieldsCount', () => {
      it('is defined', () => {
        expect(selectFieldsCount).toBeDefined();
      });
      it('counts the fields from the field capabilities', () => {
        const fieldCapabilities = {
          created: '2023-02-07T19:16:43Z',
          field_capabilities: {
            fields: {
              age: {
                integer: {
                  aggregatable: true,
                  metadata_field: false,
                  searchable: true,
                  type: 'integer',
                },
              },
              color: {
                keyword: {
                  aggregatable: true,
                  metadata_field: false,
                  searchable: true,
                  type: 'keyword',
                },
              },
              name: {
                text: {
                  aggregatable: false,
                  metadata_field: false,
                  searchable: true,
                  type: 'text',
                },
              },
            },
            indices: ['index-001', 'index-002'],
          },
          name: 'engine-001',
          updated_at_millis: 2202018295,
        };
        expect(selectFieldsCount(fieldCapabilities)).toBe(3);
      });

      it('excludes metadata fields from the count', () => {
        const fieldCapabilities = {
          created: '2023-02-07T19:16:43Z',
          field_capabilities: {
            fields: {
              _doc_count: {
                integer: {
                  aggregatable: false,
                  metadata_field: true,
                  searchable: false,
                  type: 'integer',
                },
              },
              _id: {
                _id: {
                  aggregatable: false,
                  metadata_field: true,
                  searchable: true,
                  type: '_id',
                },
              },
              _index: {
                _index: {
                  aggregatable: true,
                  metadata_field: true,
                  searchable: true,
                  type: '_index',
                },
              },
              _source: {
                _source: {
                  aggregatable: false,
                  metadata_field: true,
                  searchable: false,
                  type: '_source',
                },
              },
              _version: {
                _version: {
                  aggregatable: true,
                  metadata_field: true,
                  searchable: false,
                  type: '_version',
                },
              },
              age: {
                integer: {
                  aggregatable: true,
                  metadata_field: false,
                  searchable: true,
                  type: 'integer',
                },
              },
              color: {
                keyword: {
                  aggregatable: true,
                  metadata_field: false,
                  searchable: true,
                  type: 'keyword',
                },
              },
              name: {
                text: {
                  aggregatable: false,
                  metadata_field: false,
                  searchable: true,
                  type: 'text',
                },
              },
            },
            indices: ['index-001', 'index-002'],
          },
          name: 'foo-engine',
          updated_at_millis: 2202018295,
        };
        expect(selectFieldsCount(fieldCapabilities)).toBe(3);
      });

      it('returns 0 when field capability data is not available', () => {
        expect(selectFieldsCount(undefined)).toBe(0);
      });
    });
  });
});
