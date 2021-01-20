/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { shallow } from 'enzyme';

import { useLocalStorage } from './use_local_storage';

describe('useLocalStorage', () => {
  const KEY = 'fields';

  const TestComponent = () => {
    const [fields, setFields] = useLocalStorage(KEY, {
      options: ['foo', 'bar', 'baz'],
    });
    return (
      <div>
        <button
          id="change"
          onClick={() => {
            setFields({
              options: ['big', 'new', 'values'],
            });
          }}
        />
        {fields?.options?.join(', ')}
      </div>
    );
  };

  beforeEach(() => {
    global.localStorage.clear();
    jest.clearAllMocks();
  });

  it('will read state from localStorage on init if values already exist', () => {
    global.localStorage.setItem(
      KEY,
      JSON.stringify({
        options: ['some', 'old', 'values'],
      })
    );
    const wrapper = shallow(<TestComponent />);
    expect(wrapper.text()).toBe('some, old, values');
  });

  it('will ignore non-JSON values in localStorage', () => {
    global.localStorage.setItem(KEY, 'blah blah blah');
    const wrapper = shallow(<TestComponent />);
    expect(wrapper.text()).toBe('foo, bar, baz');
    expect(global.localStorage.getItem(KEY)).toBe('{"options":["foo","bar","baz"]}');
  });

  it('if will use provided default values if state does not already exist in localStorage', () => {
    const wrapper = shallow(<TestComponent />);
    expect(wrapper.text()).toBe('foo, bar, baz');
    expect(global.localStorage.getItem(KEY)).toBe('{"options":["foo","bar","baz"]}');
  });

  it('state can be updated with new values', () => {
    const wrapper = shallow(<TestComponent />);
    wrapper.find('#change').simulate('click');
    expect(wrapper.text()).toBe('big, new, values');
    expect(global.localStorage.getItem(KEY)).toBe('{"options":["big","new","values"]}');
  });
});
