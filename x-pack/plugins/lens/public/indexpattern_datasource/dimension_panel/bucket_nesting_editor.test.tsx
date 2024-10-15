/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { BucketNestingEditor } from './bucket_nesting_editor';
import { GenericIndexPatternColumn } from '../indexpattern';
import { IndexPatternField } from '../types';

const fieldMap: Record<string, IndexPatternField> = {
  a: { displayName: 'a' } as IndexPatternField,
  b: { displayName: 'b' } as IndexPatternField,
  c: { displayName: 'c' } as IndexPatternField,
};

const getFieldByName = (name: string): IndexPatternField | undefined => fieldMap[name];

describe('BucketNestingEditor', () => {
  function mockCol(col: Partial<GenericIndexPatternColumn> = {}): GenericIndexPatternColumn {
    const result = {
      dataType: 'string',
      isBucketed: true,
      label: 'a',
      operationType: 'terms',
      params: {
        size: 5,
        orderBy: { type: 'alphabetical' },
        orderDirection: 'asc',
      },
      sourceField: 'a',
      ...col,
    };

    return result as GenericIndexPatternColumn;
  }

  it('should display the top level grouping when at the root', () => {
    const component = mount(
      <BucketNestingEditor
        getFieldByName={getFieldByName}
        columnId="a"
        layer={{
          columnOrder: ['a', 'b', 'c'],
          columns: {
            a: mockCol(),
            b: mockCol(),
            c: mockCol({ operationType: 'min', isBucketed: false }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={jest.fn()}
      />
    );
    const nestingSwitch = component.find('[data-test-subj="indexPattern-nesting-switch"]').first();
    expect(nestingSwitch.prop('checked')).toBeTruthy();
  });

  it('should display the bottom level grouping when appropriate', () => {
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        getFieldByName={getFieldByName}
        layer={{
          columnOrder: ['b', 'a', 'c'],
          columns: {
            a: mockCol(),
            b: mockCol(),
            c: mockCol({ operationType: 'min', isBucketed: false }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={jest.fn()}
      />
    );
    const nestingSwitch = component.find('[data-test-subj="indexPattern-nesting-switch"]').first();
    expect(nestingSwitch.prop('checked')).toBeFalsy();
  });

  it('should reorder the columns when toggled', () => {
    const setColumns = jest.fn();
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        getFieldByName={getFieldByName}
        layer={{
          columnOrder: ['b', 'a', 'c'],
          columns: {
            a: mockCol(),
            b: mockCol(),
            c: mockCol({ operationType: 'min', isBucketed: false }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={setColumns}
      />
    );

    component
      .find('[data-test-subj="indexPattern-nesting-switch"] button')
      .first()
      .simulate('click');

    expect(setColumns).toHaveBeenCalledTimes(1);
    expect(setColumns).toHaveBeenCalledWith(['a', 'b', 'c']);

    component.setProps({
      layer: {
        columnOrder: ['a', 'b', 'c'],
        columns: {
          a: mockCol(),
          b: mockCol(),
          c: mockCol({ operationType: 'min', isBucketed: false }),
        },
        indexPatternId: 'foo',
      },
    });

    component
      .find('[data-test-subj="indexPattern-nesting-switch"] button')
      .first()
      .simulate('click');

    expect(setColumns).toHaveBeenCalledTimes(2);
    expect(setColumns).toHaveBeenLastCalledWith(['b', 'a', 'c']);
  });

  it('should display nothing if there are no buckets', () => {
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        getFieldByName={getFieldByName}
        layer={{
          columnOrder: ['a', 'b', 'c'],
          columns: {
            a: mockCol({ operationType: 'average', isBucketed: false }),
            b: mockCol({ operationType: 'max', isBucketed: false }),
            c: mockCol({ operationType: 'min', isBucketed: false }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={jest.fn()}
      />
    );

    expect(component.children().length).toBe(0);
  });

  it('should display nothing if there is one bucket', () => {
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        getFieldByName={getFieldByName}
        layer={{
          columnOrder: ['a', 'b', 'c'],
          columns: {
            a: mockCol(),
            b: mockCol({ operationType: 'max', isBucketed: false }),
            c: mockCol({ operationType: 'min', isBucketed: false }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={jest.fn()}
      />
    );

    expect(component.children().length).toBe(0);
  });

  it('should display a dropdown with the parent column selected if 3+ buckets', () => {
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        getFieldByName={getFieldByName}
        layer={{
          columnOrder: ['c', 'a', 'b'],
          columns: {
            a: mockCol({ operationType: 'count', isBucketed: true }),
            b: mockCol({ operationType: 'max', isBucketed: true }),
            c: mockCol({ operationType: 'min', isBucketed: true }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={jest.fn()}
      />
    );

    const control = component.find('[data-test-subj="indexPattern-nesting-select"]').first();

    expect(control.prop('value')).toEqual('c');
  });

  it('should reorder the columns when a column is selected in the dropdown', () => {
    const setColumns = jest.fn();
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        getFieldByName={getFieldByName}
        layer={{
          columnOrder: ['c', 'a', 'b'],
          columns: {
            a: mockCol({ operationType: 'count', isBucketed: true }),
            b: mockCol({ operationType: 'max', isBucketed: true }),
            c: mockCol({ operationType: 'min', isBucketed: true }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={setColumns}
      />
    );

    const control = component.find('[data-test-subj="indexPattern-nesting-select"] select').first();
    control.simulate('change', {
      target: { value: 'b' },
    });

    expect(setColumns).toHaveBeenCalledWith(['c', 'b', 'a']);
  });

  it('should move to root if the first dropdown item is selected', () => {
    const setColumns = jest.fn();
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        getFieldByName={getFieldByName}
        layer={{
          columnOrder: ['c', 'a', 'b'],
          columns: {
            a: mockCol({ operationType: 'count', isBucketed: true }),
            b: mockCol({ operationType: 'max', isBucketed: true }),
            c: mockCol({ operationType: 'min', isBucketed: true }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={setColumns}
      />
    );

    const control = component.find('[data-test-subj="indexPattern-nesting-select"] select').first();
    control.simulate('change', { target: { value: '' } });

    expect(setColumns).toHaveBeenCalledWith(['a', 'c', 'b']);
  });

  it('should allow the last bucket to be moved', () => {
    const setColumns = jest.fn();
    const component = mount(
      <BucketNestingEditor
        getFieldByName={getFieldByName}
        columnId="b"
        layer={{
          columnOrder: ['c', 'a', 'b'],
          columns: {
            a: mockCol({ operationType: 'count', isBucketed: true }),
            b: mockCol({ operationType: 'max', isBucketed: true }),
            c: mockCol({ operationType: 'min', isBucketed: true }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={setColumns}
      />
    );

    const control = component.find('[data-test-subj="indexPattern-nesting-select"] select').first();
    control.simulate('change', {
      target: { value: '' },
    });

    expect(setColumns).toHaveBeenCalledWith(['b', 'c', 'a']);
  });
});
