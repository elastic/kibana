/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { unmountHandler } from '../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { useLocalStorage } from './use_local_storage';

describe('useLocalStorage', () => {
  const addEventListener = jest.spyOn(global, 'addEventListener');
  const removeEventListener = jest.spyOn(global, 'removeEventListener');
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

  const triggerStorageEvent = (key: string) => {
    // Update storage
    global.localStorage.setItem(
      key,
      JSON.stringify({
        options: ['big', 'new', 'values'],
      })
    );

    // We manually invoke handlers here because I couldn't find a great way to trigger a `storage` event.
    // In the DOM, this is triggered whenever a storage event (like `setItem` above) occurs in another
    // context (like another page).
    addEventListener.mock.calls.forEach((call) => {
      if (call[0] === 'storage') {
        const handler: any = call[1];
        handler({ key });
      }
    });
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
  });

  it('if will use provided default values if state does not already exist in localStorage', () => {
    const wrapper = shallow(<TestComponent />);
    expect(wrapper.text()).toBe('foo, bar, baz');
  });

  it('state can be updated with new values', () => {
    const wrapper = shallow(<TestComponent />);
    wrapper.find('#change').simulate('click');
    expect(wrapper.text()).toBe('big, new, values');
  });

  it('state is updated if localStorage is updated outside of this context', () => {
    const wrapper1 = shallow(<TestComponent />);
    const wrapper2 = shallow(<TestComponent />);

    act(() => {
      triggerStorageEvent(KEY);
    });

    expect(wrapper1.text()).toBe('big, new, values');
    expect(wrapper2.text()).toBe('big, new, values');
  });

  it('state is NOT updated if localStorage is updated outside of this context using a different key', () => {
    const wrapper1 = shallow(<TestComponent />);
    const wrapper2 = shallow(<TestComponent />);

    act(() => {
      triggerStorageEvent('bogus');
    });

    expect(wrapper1.text()).toBe('foo, bar, baz');
    expect(wrapper2.text()).toBe('foo, bar, baz');
  });

  it('storage event listeners are removed after unmounting components', () => {
    shallow(<TestComponent />);
    const addStorageEventListenerCall: any = addEventListener.mock.calls.find(
      ([event]) => event === 'storage'
    );
    const handler = addStorageEventListenerCall[1];

    unmountHandler();

    expect(removeEventListener).toHaveBeenCalledWith('storage', handler);
  });
});
