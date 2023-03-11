/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { TextBasedPrivateState } from './types';
import type { DataViewsState } from '../../state_management/types';

import { TextBasedLayerPanelProps, LayerPanel } from './layerpanel';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { ChangeIndexPattern } from '../../shared_components/dataview_picker/dataview_picker';

const fields = [
  {
    name: 'timestamp',
    id: 'timestamp',
    meta: {
      type: 'date',
    },
  },
  {
    name: 'bytes',
    id: 'bytes',
    meta: {
      type: 'number',
    },
  },
  {
    name: 'memory',
    id: 'memory',
    meta: {
      type: 'number',
    },
  },
] as DatatableColumn[];

const initialState: TextBasedPrivateState = {
  layers: {
    first: {
      index: '1',
      columns: [],
      allColumns: [],
      query: { sql: 'SELECT * FROM foo' },
    },
  },
  indexPatternRefs: [
    { id: '1', title: 'my-fake-index-pattern' },
    { id: '2', title: 'my-fake-restricted-pattern' },
    { id: '3', title: 'my-compatible-pattern' },
  ],
  fieldList: fields,
};
describe('Layer Data Panel', () => {
  let defaultProps: TextBasedLayerPanelProps;

  beforeEach(() => {
    defaultProps = {
      layerId: 'first',
      state: initialState,
      onChangeIndexPattern: jest.fn(),
      dataViews: {
        indexPatternRefs: [
          { id: '1', title: 'my-fake-index-pattern', name: 'My fake index pattern' },
          { id: '2', title: 'my-fake-restricted-pattern', name: 'my-fake-restricted-pattern' },
          { id: '3', title: 'my-compatible-pattern', name: 'my-compatible-pattern' },
        ],
        indexPatterns: {},
      } as DataViewsState,
    };
  });

  it('should display the selected dataview but disabled', () => {
    const instance = shallow(<LayerPanel {...defaultProps} />);
    expect(instance.find(ChangeIndexPattern).prop('trigger')).toStrictEqual({
      fontWeight: 'normal',
      isDisabled: true,
      label: 'my-fake-index-pattern',
      size: 's',
      title: 'my-fake-index-pattern',
    });
  });
});
