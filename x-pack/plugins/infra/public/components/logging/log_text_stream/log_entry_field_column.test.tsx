/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { LogEntryFieldColumn } from './log_entry_field_column';
import { shallow } from 'enzyme';

describe('LogEntryFieldColumn', () => {
  it('should output a <ul> when displaying an Array of values', () => {
    const encodedValue = JSON.stringify(['a', 'b', 'c']);
    const component = shallow(
      <LogEntryFieldColumn
        encodedValue={encodedValue}
        isHighlighted={false}
        isHovered={false}
        isWrapped={false}
      />
    );
    expect(component.exists('ul')).toBe(true);
    expect(
      component.containsAllMatchingElements([
        <li key="LogEntryFieldColumn-a-0">a</li>,
        <li key="LogEntryFieldColumn-b-1">a</li>,
        <li key="LogEntryFieldColumn-c-2">a</li>,
      ])
    ).toBe(true);
  });
  it('should output just text when passed a non-Array', () => {
    const encodedValue = JSON.stringify('foo');
    const component = shallow(
      <LogEntryFieldColumn
        encodedValue={encodedValue}
        isHighlighted={false}
        isHovered={false}
        isWrapped={false}
      />
    );
    expect(component.exists('ul')).toBe(false);
    expect(component.text()).toEqual('foo');
  });
});
