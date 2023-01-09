/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import { FormBasedPrivateState } from './types';
import { FormBasedLayerPanelProps, LayerPanel } from './layerpanel';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { ShallowWrapper } from 'enzyme';
import { EuiSelectable } from '@elastic/eui';
import { DataViewsList } from '@kbn/unified-search-plugin/public/dataview_picker/dataview_list';
import { ChangeIndexPattern } from '../../shared_components/dataview_picker/dataview_picker';
import { getFieldByNameFactory } from './pure_helpers';
import { TermsIndexPatternColumn } from './operations';

jest.mock('@kbn/unified-search-plugin/public', () => {
  const actual = jest.requireActual('@kbn/unified-search-plugin/public');
  return {
    ...actual,
    DataViewsList: jest.requireActual(
      '@kbn/unified-search-plugin/public/dataview_picker/dataview_list'
    ).DataViewsList,
  };
});

interface IndexPatternPickerOption {
  label: string;
  checked?: 'on' | 'off';
}

const fieldsOne = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'memory',
    displayName: 'memory',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'unsupported',
    displayName: 'unsupported',
    type: 'geo',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
  },
];

const fieldsTwo = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
    aggregationRestrictions: {
      date_histogram: {
        agg: 'date_histogram',
        fixed_interval: '1d',
        delay: '7d',
        time_zone: 'UTC',
      },
    },
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
    aggregationRestrictions: {
      histogram: {
        agg: 'histogram',
        interval: 1000,
      },
      max: {
        agg: 'max',
      },
      min: {
        agg: 'min',
      },
      sum: {
        agg: 'sum',
      },
    },
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
    aggregationRestrictions: {
      terms: {
        agg: 'terms',
      },
    },
  },
];

const fieldsThree = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'memory',
    displayName: 'memory',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
  },
];

const initialState: FormBasedPrivateState = {
  currentIndexPatternId: '1',
  layers: {
    first: {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'My Op',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          sourceField: 'source',
          params: {
            size: 5,
            orderDirection: 'asc',
            orderBy: {
              type: 'alphabetical',
            },
          },
        } as TermsIndexPatternColumn,
        col2: {
          label: 'My Op',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'memory',
        },
      },
    },
  },
};
describe('Layer Data Panel', () => {
  let defaultProps: FormBasedLayerPanelProps;

  beforeEach(() => {
    defaultProps = {
      layerId: 'first',
      state: initialState,
      onChangeIndexPattern: jest.fn(),
      dataViews: {
        indexPatternRefs: [
          { id: '1', title: 'my-fake-index-pattern' },
          { id: '2', title: 'my-fake-restricted-pattern' },
          { id: '3', title: 'my-compatible-pattern' },
        ],
        indexPatterns: {
          '1': {
            id: '1',
            title: 'my-fake-index-pattern',
            timeFieldName: 'timestamp',
            hasRestrictions: false,
            fields: fieldsOne,
            getFieldByName: getFieldByNameFactory(fieldsOne),
            isPersisted: true,
            spec: {},
          },
          '2': {
            id: '2',
            title: 'my-fake-restricted-pattern',
            hasRestrictions: true,
            timeFieldName: 'timestamp',
            fields: fieldsTwo,
            getFieldByName: getFieldByNameFactory(fieldsTwo),
            isPersisted: true,
            spec: {},
          },
          '3': {
            id: '3',
            title: 'my-compatible-pattern',
            timeFieldName: 'timestamp',
            hasRestrictions: false,
            fields: fieldsThree,
            getFieldByName: getFieldByNameFactory(fieldsThree),
            isPersisted: true,
            spec: {},
          },
        },
      },
    };
  });

  function getIndexPatternPickerList(instance: ShallowWrapper) {
    return instance
      .find(ChangeIndexPattern)
      .first()
      .dive()
      .find(DataViewsList)
      .first()
      .dive()
      .find(EuiSelectable);
  }

  function selectIndexPatternPickerOption(instance: ShallowWrapper, selectedLabel: string) {
    const event = {} as MouseEvent;
    const options: IndexPatternPickerOption[] = getIndexPatternPickerOptions(instance).map(
      (option: IndexPatternPickerOption) =>
        option.label === selectedLabel
          ? { ...option, checked: 'on' }
          : { ...option, checked: undefined }
    );
    const selectedOption = { label: selectedLabel };
    return getIndexPatternPickerList(instance).prop('onChange')!(options, event, selectedOption);
  }

  function getIndexPatternPickerOptions(instance: ShallowWrapper) {
    return getIndexPatternPickerList(instance).prop('options');
  }

  it('should list all index patterns', () => {
    const instance = shallow(<LayerPanel {...defaultProps} />);

    expect(
      getIndexPatternPickerOptions(instance)!.map(
        (option: IndexPatternPickerOption) => option.label
      )
    ).toEqual(['my-compatible-pattern', 'my-fake-index-pattern', 'my-fake-restricted-pattern']);
  });

  it('should switch data panel to target index pattern', () => {
    const instance = shallow(<LayerPanel {...defaultProps} />);

    selectIndexPatternPickerOption(instance, 'my-compatible-pattern');

    expect(defaultProps.onChangeIndexPattern).toHaveBeenCalledWith('3');
  });
});
