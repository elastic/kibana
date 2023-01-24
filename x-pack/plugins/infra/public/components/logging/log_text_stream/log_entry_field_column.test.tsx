/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { LogFieldColumn } from '../../../../common/log_entry';
import { LogEntryFieldColumn } from './log_entry_field_column';

describe('LogEntryFieldColumn', () => {
  it('renders a single value without a wrapping list', () => {
    const column: LogFieldColumn = {
      columnId: 'TEST_COLUMN',
      field: 'TEST_FIELD',
      value: ['a'],
      highlights: [],
    };

    const renderResult = render(
      <LogEntryFieldColumn
        columnValue={column}
        highlights={[]}
        isActiveHighlight={false}
        wrapMode="pre-wrapped"
      />,
      { wrapper: EuiThemeProvider }
    );

    expect(renderResult.getByTestId('LogEntryColumnContent')).toHaveTextContent(/^a$/);
    expect(renderResult.queryByTestId('LogEntryFieldValues')).toBe(null);
  });

  it('renders an array of values as a list', () => {
    const column: LogFieldColumn = {
      columnId: 'TEST_COLUMN',
      field: 'TEST_FIELD',
      value: ['a', 'b', 'c'],
      highlights: [],
    };

    const renderResult = render(
      <LogEntryFieldColumn
        columnValue={column}
        highlights={[]}
        isActiveHighlight={false}
        wrapMode="pre-wrapped"
      />,
      { wrapper: EuiThemeProvider }
    );

    expect(renderResult.getByTestId('LogEntryFieldValues')).not.toBeEmptyDOMElement();
    expect(renderResult.getByTestId('LogEntryFieldValue-0')).toHaveTextContent('a');
    expect(renderResult.getByTestId('LogEntryFieldValue-1')).toHaveTextContent('b');
    expect(renderResult.getByTestId('LogEntryFieldValue-2')).toHaveTextContent('c');
  });

  it('renders a text representation of a single complex object', () => {
    const column: LogFieldColumn = {
      columnId: 'TEST_COLUMN',
      field: 'TEST_FIELD',
      value: [
        {
          lat: 1,
          lon: 2,
        },
      ],
      highlights: [],
    };

    const renderResult = render(
      <LogEntryFieldColumn
        columnValue={column}
        highlights={[]}
        isActiveHighlight={false}
        wrapMode="pre-wrapped"
      />,
      { wrapper: EuiThemeProvider }
    );

    expect(renderResult.getByTestId('LogEntryColumnContent')).toHaveTextContent(
      '{"lat":1,"lon":2}'
    );
  });

  it('renders text representations of a multiple complex objects', () => {
    const column: LogFieldColumn = {
      columnId: 'TEST_COLUMN',
      field: 'TEST_FIELD',
      value: [
        {
          lat: 1,
          lon: 2,
        },
        [3, 4],
      ],
      highlights: [],
    };

    const renderResult = render(
      <LogEntryFieldColumn
        columnValue={column}
        highlights={[]}
        isActiveHighlight={false}
        wrapMode="pre-wrapped"
      />,
      { wrapper: EuiThemeProvider }
    );

    expect(renderResult.getByTestId('LogEntryFieldValues')).not.toBeEmptyDOMElement();
    expect(renderResult.getByTestId('LogEntryFieldValue-0')).toHaveTextContent('{"lat":1,"lon":2}');
    expect(renderResult.getByTestId('LogEntryFieldValue-1')).toHaveTextContent('[3,4]');
  });
});
