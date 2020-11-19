/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { dataPluginMock } from '../../../../../../../../src/plugins/data/public/mocks';
import { FiltersIndexPatternColumn } from '.';
import { filtersOperation } from '../index';
import { IndexPatternPrivateState } from '../../../types';
import { FilterPopover } from './filter_popover';

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: {} as IUiSettingsClient,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  http: {} as HttpSetup,
};

// mocking random id generator function
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: (fn: unknown) => {
      let counter = 0;
      return () => counter++;
    },
  };
});

describe('filters', () => {
  let state: IndexPatternPrivateState;
  const InlineOptions = filtersOperation.paramEditor!;

  beforeEach(() => {
    state = {
      indexPatternRefs: [],
      indexPatterns: {},
      existingFields: {},
      currentIndexPatternId: '1',
      isFirstExistenceFetch: false,
      layers: {
        first: {
          indexPatternId: '1',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: {
              label: 'filters',
              dataType: 'document',
              operationType: 'filters',
              scale: 'ordinal',
              isBucketed: true,
              params: {
                filters: [
                  {
                    input: { query: 'bytes >= 1', language: 'kuery' },
                    label: 'More than one',
                  },
                  {
                    input: { query: 'src : 2', language: 'kuery' },
                    label: '',
                  },
                ],
              },
            },
            col2: {
              label: 'Count',
              dataType: 'number',
              isBucketed: false,
              sourceField: 'Records',
              operationType: 'count',
            },
          },
        },
      },
    };
  });

  describe('toEsAggsConfig', () => {
    it('should reflect params correctly', () => {
      const esAggsConfig = filtersOperation.toEsAggsConfig(
        state.layers.first.columns.col1 as FiltersIndexPatternColumn,
        'col1',
        state.indexPatterns['1']
      );
      expect(esAggsConfig).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            filters: [
              {
                input: { query: 'bytes >= 1', language: 'kuery' },
                label: 'More than one',
              },
              {
                input: { query: 'src : 2', language: 'kuery' },
                label: '',
              },
            ],
          }),
        })
      );
    });
  });

  describe('getPossibleOperation', () => {
    it('should return operation with the right type for document', () => {
      expect(filtersOperation.getPossibleOperation()).toEqual({
        dataType: 'string',
        isBucketed: true,
        scale: 'ordinal',
      });
    });
  });

  describe('popover param editor', () => {
    // @ts-expect-error
    window['__react-beautiful-dnd-disable-dev-warnings'] = true; // issue with enzyme & react-beautiful-dnd throwing errors: https://github.com/atlassian/react-beautiful-dnd/issues/1593
    jest.mock('../../../../../../../../src/plugins/data/public', () => ({
      QueryStringInput: () => {
        return 'QueryStringInput';
      },
    }));

    it('should update state when changing a filter', () => {
      const setStateSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          state={state}
          setState={setStateSpy}
          columnId="col1"
          currentColumn={state.layers.first.columns.col1 as FiltersIndexPatternColumn}
          layerId="first"
        />
      );

      act(() => {
        instance.find(FilterPopover).first().prop('setFilter')!({
          input: {
            query: 'dest : 5',
            language: 'lucene',
          },
          label: 'Dest5',
          id: 0,
        });
      });
      instance.update();
      expect(setStateSpy).toHaveBeenCalledWith({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col1: {
                ...state.layers.first.columns.col1,
                params: {
                  filters: [
                    {
                      input: {
                        query: 'dest : 5',
                        language: 'lucene',
                      },
                      label: 'Dest5',
                    },
                    {
                      input: {
                        language: 'kuery',
                        query: 'src : 2',
                      },
                      label: '',
                    },
                  ],
                },
              },
            },
          },
        },
      });
    });

    describe('Modify filters', () => {
      it('should correctly show existing filters ', () => {
        const setStateSpy = jest.fn();
        const instance = mount(
          <InlineOptions
            {...defaultProps}
            state={state}
            setState={setStateSpy}
            columnId="col1"
            currentColumn={state.layers.first.columns.col1 as FiltersIndexPatternColumn}
            layerId="first"
          />
        );
        expect(
          instance
            .find('[data-test-subj="indexPattern-filters-existingFilterContainer"]')
            .at(0)
            .text()
        ).toEqual('More than one');
        expect(
          instance
            .find('[data-test-subj="indexPattern-filters-existingFilterContainer"]')
            .at(3)
            .text()
        ).toEqual('src : 2');
      });

      it('should remove filter', () => {
        const setStateSpy = jest.fn();
        const instance = mount(
          <InlineOptions
            {...defaultProps}
            state={state}
            setState={setStateSpy}
            columnId="col1"
            currentColumn={state.layers.first.columns.col1 as FiltersIndexPatternColumn}
            layerId="first"
          />
        );

        instance
          .find('[data-test-subj="lns-customBucketContainer-remove"]')
          .at(2)
          .simulate('click');
        expect(setStateSpy).toHaveBeenCalledWith({
          ...state,
          layers: {
            first: {
              ...state.layers.first,
              columns: {
                ...state.layers.first.columns,
                col1: {
                  ...state.layers.first.columns.col1,
                  params: {
                    filters: [
                      {
                        input: {
                          language: 'kuery',
                          query: 'bytes >= 1',
                        },
                        label: 'More than one',
                      },
                    ],
                  },
                },
              },
            },
          },
        });
      });
    });
  });
});
