/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import 'jest-styled-components';
import React from 'react';
import {
  FormattedKey,
  FormattedValue,
  NestedKeyValueTable,
  NestedValue
} from '../NestedKeyValueTable';

describe('NestedKeyValueTable component', () => {
  it('should render with data', () => {
    const testData = {
      a: 1,
      b: 2,
      c: [3, 4, 5],
      d: { aa: 1, bb: 2 }
    };
    expect(
      shallow(<NestedKeyValueTable data={testData} depth={0} />)
    ).toMatchSnapshot();
  });

  it('should render an empty table if there is no data', () => {
    expect(
      shallow(<NestedKeyValueTable data={{}} depth={0} />)
    ).toMatchSnapshot();
  });
});

describe('NestedValue component', () => {
  it('should render a formatted value when depth is 0', () => {
    const wrapper = shallow(
      <NestedValue value={{ a: 'hello' }} depth={0} parentKey="who_cares" />
    );

    expect(
      wrapper.equals(
        <NestedKeyValueTable
          data={{ a: 'hello' }}
          depth={1}
          parentKey="who_cares"
        />
      )
    ).toBe(true);
  });

  it('should render a formatted value when depth > 0 but value is not an object', () => {
    expect(
      shallow(<NestedValue value={2} depth={3} parentKey="who_cares" />)
    ).toMatchSnapshot();
  });

  it('should render a nested KV Table when depth > 0 and value is an object', () => {
    expect(
      shallow(
        <NestedValue value={{ a: 'hello' }} depth={1} parentKey="who_cares" />
      )
    ).toMatchSnapshot();
  });
});

describe('FormattedValue component', () => {
  it('should render an object', () => {
    expect(mount(<FormattedValue value={{ a: 'ok' }} />)).toMatchSnapshot();
  });

  it('should render an array', () => {
    expect(mount(<FormattedValue value={[1, 2, 3]} />)).toMatchSnapshot();
  });

  it('should render a boolean', () => {
    expect(mount(<FormattedValue value={true} />)).toMatchSnapshot();
    expect(mount(<FormattedValue value={false} />)).toMatchSnapshot();
  });

  it('should render a number', () => {
    expect(mount(<FormattedValue value={243} />)).toMatchSnapshot();
  });

  it('should render a string', () => {
    expect(mount(<FormattedValue value="hey ok cool" />)).toMatchSnapshot();
  });

  it('should render null', () => {
    expect(mount(<FormattedValue value={null} />)).toMatchSnapshot();
  });

  it('should render undefined', () => {
    expect(mount(<FormattedValue value={undefined} />)).toMatchSnapshot();
  });
});

describe('FormattedKey component', () => {
  it('should render when the value is null or undefined', () => {
    expect(mount(<FormattedKey k="testKey" value={null} />)).toMatchSnapshot();
    expect(
      mount(<FormattedKey k="testKey" value={undefined} />)
    ).toMatchSnapshot();
  });

  it('should render when the value is defined', () => {
    expect(mount(<FormattedKey k="testKey" value="hi" />)).toMatchSnapshot();
    expect(mount(<FormattedKey k="testKey" value={123} />)).toMatchSnapshot();
    expect(mount(<FormattedKey k="testKey" value={{}} />)).toMatchSnapshot();
  });
});
