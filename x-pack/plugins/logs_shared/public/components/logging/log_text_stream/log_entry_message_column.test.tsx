/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { LogMessageColumn } from '../../../../common/log_entry';
import { LogEntryMessageColumn } from './log_entry_message_column';

describe('LogEntryMessageColumn', () => {
  it('renders a single scalar field value without a wrapping list', () => {
    const column: LogMessageColumn = {
      columnId: 'TEST_COLUMN',
      message: [{ field: 'TEST_FIELD', value: ['VALUE'], highlights: [] }],
    };

    const renderResult = render(
      <LogEntryMessageColumn
        columnValue={column}
        highlights={[]}
        isActiveHighlight={false}
        wrapMode="pre-wrapped"
      />,
      { wrapper: EuiThemeProvider }
    );

    expect(renderResult.getByTestId('LogEntryColumnContent')).toHaveTextContent(/^VALUE$/);
    expect(renderResult.queryByTestId('LogEntryFieldValues')).toBe(null);
  });

  it('renders a single array of scalar field values as a list', () => {
    const column: LogMessageColumn = {
      columnId: 'TEST_COLUMN',
      message: [{ field: 'TEST_FIELD', value: ['VALUE_1', 'VALUE_2'], highlights: [] }],
    };

    const renderResult = render(
      <LogEntryMessageColumn
        columnValue={column}
        highlights={[]}
        isActiveHighlight={false}
        wrapMode="pre-wrapped"
      />,
      { wrapper: EuiThemeProvider }
    );

    expect(renderResult.getByTestId('LogEntryFieldValues')).not.toBeEmptyDOMElement();
    expect(renderResult.getByTestId('LogEntryFieldValue-0')).toHaveTextContent('VALUE_1');
    expect(renderResult.getByTestId('LogEntryFieldValue-1')).toHaveTextContent('VALUE_2');
  });

  it('renders a complex message with an array of complex field values', () => {
    const column: LogMessageColumn = {
      columnId: 'TEST_COLUMN',
      message: [
        { constant: 'CONSTANT_1' },
        { field: 'TEST_FIELD', value: [{ lat: 1, lon: 2 }, 'VALUE_2'], highlights: [] },
        { constant: 'CONSTANT_2' },
      ],
    };

    const renderResult = render(
      <LogEntryMessageColumn
        columnValue={column}
        highlights={[]}
        isActiveHighlight={false}
        wrapMode="pre-wrapped"
      />,
      { wrapper: EuiThemeProvider }
    );

    expect(renderResult.getByTestId('LogEntryColumnContent')).toHaveTextContent(
      /^CONSTANT_1.*{"lat":1,"lon":2}.*VALUE_2.*CONSTANT_2$/
    );
    expect(renderResult.getByTestId('LogEntryFieldValues')).not.toBeEmptyDOMElement();
    expect(renderResult.getByTestId('LogEntryFieldValue-0')).toHaveTextContent('{"lat":1,"lon":2}');
    expect(renderResult.getByTestId('LogEntryFieldValue-1')).toHaveTextContent('VALUE_2');
  });
});
