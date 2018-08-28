/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import {
  NestedKeyValueTable,
  NestedValue,
  FormattedValue,
  FormattedKey
} from '../NestedKeyValueTable';

describe('NestedKeyValueTable component', () => {
  it('should render with data', () => {
    const testData = {
      a: 1,
      b: 2,
      c: [3, 4, 5],
      d: { aa: 1, bb: 2 }
    };
    expect(shallow(<NestedKeyValueTable data={testData} />)).toMatchSnapshot();
  });
  it('should render an empty table if there is no data', () => {
    expect(shallow(<NestedKeyValueTable data={{}} />)).toMatchSnapshot();
  });
});

describe('NestedValue component', () => {
  let props;

  beforeEach(() => {
    props = {
      value: { a: 'hello' },
      depth: 0,
      keySorter: jest.fn(),
      parentKey: 'who_cares'
    };
  });

  it('should render a formatted value when depth is 0', () => {
    expect(shallow(<NestedValue {...props} />)).toMatchSnapshot();
  });

  it('should render a formatted value when depth > 0 but value is not an object', () => {
    props.value = 2;
    props.depth = 3;
    expect(shallow(<NestedValue {...props} />)).toMatchSnapshot();
  });

  it('should render a nested KV Table when depth > 0 and value is an object', () => {
    props.depth = 1;
    expect(shallow(<NestedValue {...props} />)).toMatchSnapshot();
  });
});

describe('FormattedValue component', () => {
  it('should render an object', () => {
    expect(shallow(<FormattedValue value={{ a: 'ok' }} />)).toMatchSnapshot();
  });

  it('should render an array', () => {
    expect(shallow(<FormattedValue value={[1, 2, 3]} />)).toMatchSnapshot();
  });

  it('should render a boolean', () => {
    expect(shallow(<FormattedValue value={true} />)).toMatchSnapshot();
    expect(shallow(<FormattedValue value={false} />)).toMatchSnapshot();
  });

  it('should render a number', () => {
    expect(shallow(<FormattedValue value={243} />)).toMatchSnapshot();
  });

  it('should render a string', () => {
    expect(shallow(<FormattedValue value="hey ok cool" />)).toMatchSnapshot();
  });

  it('should render null', () => {
    expect(shallow(<FormattedValue value={null} />)).toMatchSnapshot();
  });

  it('should render undefined', () => {
    let b;
    expect(shallow(<FormattedValue value={b} />)).toMatchSnapshot();
    expect(shallow(<FormattedValue />)).toMatchSnapshot();
  });
});

describe('FormattedKey component', () => {
  it('should render when the value is null or undefined', () => {
    let nope;
    expect(
      shallow(<FormattedKey k="testKey" value={null} />)
    ).toMatchSnapshot();
    expect(
      shallow(<FormattedKey k="testKey" value={nope} />)
    ).toMatchSnapshot();
    expect(shallow(<FormattedKey k="testKey" />)).toMatchSnapshot();
  });
});
