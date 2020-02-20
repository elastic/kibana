/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { EuiThemeProvider } from '../../../../../observability/public';
import { LogEntryColumn } from '../../../utils/log_entry';
import { LogEntryFieldColumn } from './log_entry_field_column';

describe('LogEntryFieldColumn', () => {
  it('should output a <ul> when displaying an Array of values', () => {
    const column: LogEntryColumn = {
      columnId: 'TEST_COLUMN',
      field: 'TEST_FIELD',
      value: JSON.stringify(['a', 'b', 'c']),
    };

    const component = mount(
      <LogEntryFieldColumn
        columnValue={column}
        highlights={[]}
        isActiveHighlight={false}
        isHighlighted={false}
        isHovered={false}
        isWrapped={false}
      />,
      { wrappingComponent: EuiThemeProvider } as any // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/36075
    );

    expect(component.exists('ul')).toBe(true);
    expect(
      component.containsAllMatchingElements([
        <li key="LogEntryFieldColumn-a-0">a</li>,
        <li key="LogEntryFieldColumn-b-1">b</li>,
        <li key="LogEntryFieldColumn-c-2">c</li>,
      ])
    ).toBe(true);
  });

  it('should output a text representation of a passed complex value', () => {
    const column: LogEntryColumn = {
      columnId: 'TEST_COLUMN',
      field: 'TEST_FIELD',
      value: JSON.stringify({
        lat: 1,
        lon: 2,
      }),
    };

    const component = mount(
      <LogEntryFieldColumn
        columnValue={column}
        highlights={[]}
        isActiveHighlight={false}
        isHighlighted={false}
        isHovered={false}
        isWrapped={false}
      />,
      { wrappingComponent: EuiThemeProvider } as any // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/36075
    );

    expect(component.text()).toEqual('{"lat":1,"lon":2}');
  });

  it('should output just text when passed a non-Array', () => {
    const column: LogEntryColumn = {
      columnId: 'TEST_COLUMN',
      field: 'TEST_FIELD',
      value: JSON.stringify('foo'),
    };

    const component = mount(
      <LogEntryFieldColumn
        columnValue={column}
        highlights={[]}
        isActiveHighlight={false}
        isHighlighted={false}
        isHovered={false}
        isWrapped={false}
      />,
      { wrappingComponent: EuiThemeProvider } as any // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/36075
    );

    expect(component.exists('ul')).toBe(false);
    expect(component.text()).toEqual('foo');
  });
});
