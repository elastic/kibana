/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { BucketNestingEditor } from './bucket_nesting_editor';
import { IndexPatternColumn } from '../indexpattern';

describe('BucketNestingEditor', () => {
  function mockCol(col: Partial<IndexPatternColumn> = {}): IndexPatternColumn {
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
      suggestedPriority: 0,
      ...col,
    };

    return result as IndexPatternColumn;
  }

  it('should display the top level grouping when at the root', () => {
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        layer={{
          columnOrder: ['a', 'b', 'c'],
          columns: {
            a: mockCol({ suggestedPriority: 0 }),
            b: mockCol({ suggestedPriority: 1 }),
            c: mockCol({ suggestedPriority: 2, operationType: 'min', isBucketed: false }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={jest.fn()}
      />
    );
    const control1 = component.find('[data-test-subj="indexPattern-nesting-topLevel"]').first();
    const control2 = component.find('[data-test-subj="indexPattern-nesting-bottomLevel"]').first();

    expect(control1.prop('checked')).toBeTruthy();
    expect(control2.prop('checked')).toBeFalsy();
  });

  it('should display the bottom level grouping when appropriate', () => {
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        layer={{
          columnOrder: ['b', 'a', 'c'],
          columns: {
            a: mockCol({ suggestedPriority: 0 }),
            b: mockCol({ suggestedPriority: 1 }),
            c: mockCol({ suggestedPriority: 2, operationType: 'min', isBucketed: false }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={jest.fn()}
      />
    );

    const control1 = component.find('[data-test-subj="indexPattern-nesting-topLevel"]').first();
    const control2 = component.find('[data-test-subj="indexPattern-nesting-bottomLevel"]').first();

    expect(control1.prop('checked')).toBeFalsy();
    expect(control2.prop('checked')).toBeTruthy();
  });

  it('should reorder the columns when toggled', () => {
    const setColumns = jest.fn();
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        layer={{
          columnOrder: ['b', 'a', 'c'],
          columns: {
            a: mockCol({ suggestedPriority: 0 }),
            b: mockCol({ suggestedPriority: 1 }),
            c: mockCol({ suggestedPriority: 2, operationType: 'min', isBucketed: false }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={setColumns}
      />
    );
    const control1 = component.find('[data-test-subj="indexPattern-nesting-topLevel"]').first();

    (control1.prop('onChange') as () => {})();

    expect(setColumns).toHaveBeenCalledTimes(1);
    expect(setColumns).toHaveBeenCalledWith(['a', 'b', 'c']);

    component.setProps({
      layer: {
        columnOrder: ['a', 'b', 'c'],
        columns: {
          a: mockCol({ suggestedPriority: 0 }),
          b: mockCol({ suggestedPriority: 1 }),
          c: mockCol({ suggestedPriority: 2, operationType: 'min', isBucketed: false }),
        },
        indexPatternId: 'foo',
      },
    });

    const control2 = component.find('[data-test-subj="indexPattern-nesting-bottomLevel"]').first();

    (control2.prop('onChange') as () => {})();

    expect(setColumns).toHaveBeenCalledTimes(2);
    expect(setColumns).toHaveBeenLastCalledWith(['b', 'a', 'c']);
  });

  it('should display nothing if there are no buckets', () => {
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        layer={{
          columnOrder: ['a', 'b', 'c'],
          columns: {
            a: mockCol({ suggestedPriority: 0, operationType: 'avg', isBucketed: false }),
            b: mockCol({ suggestedPriority: 1, operationType: 'max', isBucketed: false }),
            c: mockCol({ suggestedPriority: 2, operationType: 'min', isBucketed: false }),
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
        layer={{
          columnOrder: ['a', 'b', 'c'],
          columns: {
            a: mockCol({ suggestedPriority: 0 }),
            b: mockCol({ suggestedPriority: 1, operationType: 'max', isBucketed: false }),
            c: mockCol({ suggestedPriority: 2, operationType: 'min', isBucketed: false }),
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
        layer={{
          columnOrder: ['c', 'a', 'b'],
          columns: {
            a: mockCol({ suggestedPriority: 0, operationType: 'count', isBucketed: true }),
            b: mockCol({ suggestedPriority: 1, operationType: 'max', isBucketed: true }),
            c: mockCol({ suggestedPriority: 2, operationType: 'min', isBucketed: true }),
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
        layer={{
          columnOrder: ['c', 'a', 'b'],
          columns: {
            a: mockCol({ suggestedPriority: 0, operationType: 'count', isBucketed: true }),
            b: mockCol({ suggestedPriority: 1, operationType: 'max', isBucketed: true }),
            c: mockCol({ suggestedPriority: 2, operationType: 'min', isBucketed: true }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={setColumns}
      />
    );

    const control = component.find('[data-test-subj="indexPattern-nesting-select"]').first();
    (control.prop('onChange') as (e: unknown) => {})({
      target: { value: 'b' },
    });

    expect(setColumns).toHaveBeenCalledWith(['c', 'b', 'a']);
  });

  it('should move to root if the first dropdown item is selected', () => {
    const setColumns = jest.fn();
    const component = mount(
      <BucketNestingEditor
        columnId="a"
        layer={{
          columnOrder: ['c', 'a', 'b'],
          columns: {
            a: mockCol({ suggestedPriority: 0, operationType: 'count', isBucketed: true }),
            b: mockCol({ suggestedPriority: 1, operationType: 'max', isBucketed: true }),
            c: mockCol({ suggestedPriority: 2, operationType: 'min', isBucketed: true }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={setColumns}
      />
    );

    const control = component.find('[data-test-subj="indexPattern-nesting-select"]').first();
    (control.prop('onChange') as (e: unknown) => {})({
      target: { value: '' },
    });

    expect(setColumns).toHaveBeenCalledWith(['a', 'c', 'b']);
  });

  it('should allow the last bucket to be moved', () => {
    const setColumns = jest.fn();
    const component = mount(
      <BucketNestingEditor
        columnId="b"
        layer={{
          columnOrder: ['c', 'a', 'b'],
          columns: {
            a: mockCol({ suggestedPriority: 0, operationType: 'count', isBucketed: true }),
            b: mockCol({ suggestedPriority: 1, operationType: 'max', isBucketed: true }),
            c: mockCol({ suggestedPriority: 2, operationType: 'min', isBucketed: true }),
          },
          indexPatternId: 'foo',
        }}
        setColumns={setColumns}
      />
    );

    const control = component.find('[data-test-subj="indexPattern-nesting-select"]').first();
    (control.prop('onChange') as (e: unknown) => {})({
      target: { value: '' },
    });

    expect(setColumns).toHaveBeenCalledWith(['b', 'c', 'a']);
  });
});
