/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { KeyValueFilterList } from '.';
import {
  expectTextsInDocument,
  renderWithTheme,
} from '../../../utils/test_helpers';
import { fireEvent } from '@testing-library/react';

describe('KeyValueFilterList', () => {
  it('hides accordion when key value list is empty', () => {
    const { container } = renderWithTheme(
      <KeyValueFilterList
        title="foo"
        keyValueList={[]}
        onClickFilter={jest.fn}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
  it('shows list of key value pairs', () => {
    const component = renderWithTheme(
      <KeyValueFilterList
        title="title"
        keyValueList={[
          { key: 'foo', value: 'foo value' },
          { key: 'bar', value: 'bar value' },
        ]}
        onClickFilter={jest.fn}
      />
    );
    expectTextsInDocument(component, [
      'title',
      'foo',
      'foo value',
      'bar',
      'bar value',
    ]);
  });
  it('shows icon and title on accordion', () => {
    const component = renderWithTheme(
      <KeyValueFilterList
        title="title"
        icon="alert"
        keyValueList={[
          { key: 'foo', value: 'foo value' },
          { key: 'bar', value: 'bar value' },
        ]}
        onClickFilter={jest.fn}
      />
    );
    expect(component.getByTestId('accordion_title_icon')).toBeInTheDocument();
    expectTextsInDocument(component, ['title']);
  });
  it('hides icon and only shows title on accordion', () => {
    const component = renderWithTheme(
      <KeyValueFilterList
        title="title"
        keyValueList={[
          { key: 'foo', value: 'foo value' },
          { key: 'bar', value: 'bar value' },
        ]}
        onClickFilter={jest.fn}
      />
    );
    expect(component.queryAllByTestId('accordion_title_icon')).toEqual([]);
    expectTextsInDocument(component, ['title']);
  });
  it('returns selected key value when the filter button is clicked', () => {
    const mockFilter = jest.fn();
    const component = renderWithTheme(
      <KeyValueFilterList
        title="title"
        keyValueList={[
          { key: 'foo', value: 'foo value' },
          { key: 'bar', value: 'bar value' },
        ]}
        onClickFilter={mockFilter}
      />
    );

    fireEvent.click(component.getByTestId('filter_by_foo'));
    expect(mockFilter).toHaveBeenCalledWith({ key: 'foo', value: 'foo value' });
  });
});
