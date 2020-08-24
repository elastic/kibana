/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiRange, EuiSelect } from '@elastic/eui';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { dataPluginMock } from '../../../../../../../../src/plugins/data/public/mocks';
import { createMockedIndexPattern } from '../../../mocks';
import { FiltersIndexPatternColumn } from '.';
import { filtersOperation } from '../../index';
import { IndexPatternPrivateState } from '../../../types';

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: {} as IUiSettingsClient,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  http: {} as HttpSetup,
};

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
              label: 'Search query',
              dataType: 'document',
              operationType: 'filters',
              scale: 'ordinal',
              isBucketed: true,
              sourceField: 'Records',
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
        'col1'
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

  describe('getPossibleOperationForField', () => {
    it('should return operation with the right type for document', () => {
      expect(
        filtersOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'document',
          aggregationRestrictions: {
            terms: {
              agg: 'terms',
            },
          },
        })
      ).toEqual({
        dataType: 'number',
        isBucketed: true,
        scale: 'ordinal',
      });
    });

    it('should not return an operation if field type is not document', () => {
      expect(
        filtersOperation.getPossibleOperationForField({
          aggregatable: false,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
        })
      ).toEqual(undefined);
    });
  });

  describe('buildColumn', () => {
    it('should use type from the passed field', () => {
      const filtersColumn = filtersOperation.buildColumn({
        layerId: 'first',
        suggestedPriority: undefined,
        indexPattern: createMockedIndexPattern(),
        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          displayName: 'test',
          name: 'test',
        },
        columns: {},
      });
      expect(filtersColumn.dataType).toEqual('boolean');
    });
  });
});
