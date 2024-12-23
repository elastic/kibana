/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BucketNestingEditor } from './bucket_nesting_editor';
import { GenericIndexPatternColumn } from '../form_based';
import { IndexPatternField } from '../../../types';

const fieldMap: Record<string, IndexPatternField> = {
  a: { displayName: 'a' } as IndexPatternField,
  b: { displayName: 'b' } as IndexPatternField,
  c: { displayName: 'c' } as IndexPatternField,
};

const getFieldByName = (name: string): IndexPatternField | undefined => fieldMap[name];

describe('BucketNestingEditor', () => {
  function mockCol(col: Partial<GenericIndexPatternColumn> = {}): GenericIndexPatternColumn {
    return {
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
    } as GenericIndexPatternColumn;
  }

  it('should display the top level grouping when at the root', () => {
    render(
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
    const nestingSwitch = screen.getByTestId('indexPattern-nesting-switch');
    expect(nestingSwitch).toBeChecked();
  });

  it('should display the bottom level grouping when appropriate', () => {
    render(
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
    const nestingSwitch = screen.getByTestId('indexPattern-nesting-switch');
    expect(nestingSwitch).not.toBeChecked();
  });

  it('should reorder the columns when toggled', async () => {
    const setColumns = jest.fn();
    const { rerender } = render(
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

    await userEvent.click(screen.getByTestId('indexPattern-nesting-switch'));
    expect(setColumns).toHaveBeenCalledTimes(1);
    expect(setColumns).toHaveBeenCalledWith(['a', 'b', 'c']);

    rerender(
      <BucketNestingEditor
        columnId="a"
        getFieldByName={getFieldByName}
        layer={{
          columnOrder: ['a', 'b', 'c'],
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

    await userEvent.click(screen.getByTestId('indexPattern-nesting-switch'));
    expect(setColumns).toHaveBeenCalledTimes(2);
    expect(setColumns).toHaveBeenLastCalledWith(['b', 'a', 'c']);
  });

  it('should display nothing if there are no buckets', () => {
    const { container } = render(
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

    expect(container.firstChild).toBeNull();
  });

  it('should display nothing if there is one bucket', () => {
    const { container } = render(
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

    expect(container.firstChild).toBeNull();
  });

  it('should display a dropdown with the parent column selected if 3+ buckets', () => {
    render(
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

    const control = screen.getByTestId('indexPattern-nesting-select');
    expect((control as HTMLSelectElement).value).toEqual('c');
  });

  it('should reorder the columns when a column is selected in the dropdown', async () => {
    const setColumns = jest.fn();
    render(
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

    const control = screen.getByTestId('indexPattern-nesting-select');
    await userEvent.selectOptions(control, 'b');

    expect(setColumns).toHaveBeenCalledWith(['c', 'b', 'a']);
  });

  it('should move to root if the first dropdown item is selected', async () => {
    const setColumns = jest.fn();
    render(
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

    const control = screen.getByTestId('indexPattern-nesting-select');
    await userEvent.selectOptions(control, '');

    expect(setColumns).toHaveBeenCalledWith(['a', 'c', 'b']);
  });

  it('should allow the last bucket to be moved', async () => {
    const setColumns = jest.fn();
    render(
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

    const control = screen.getByTestId('indexPattern-nesting-select');
    await userEvent.selectOptions(control, '');

    expect(setColumns).toHaveBeenCalledWith(['b', 'c', 'a']);
  });
});
