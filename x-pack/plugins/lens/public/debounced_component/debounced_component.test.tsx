/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { debouncedComponent } from './debounced_component';
import { act } from 'react-dom/test-utils';

describe('debouncedComponent', () => {
  test('immediately renders', () => {
    const TestComponent = debouncedComponent(({ title }: { title: string }) => {
      return <h1>{title}</h1>;
    });
    expect(mount(<TestComponent title="hoi" />).html()).toMatchInlineSnapshot(`"<h1>hoi</h1>"`);
  });

  test('debounces changes', async () => {
    const TestComponent = debouncedComponent(({ title }: { title: string }) => {
      return <h1>{title}</h1>;
    }, 1);
    const component = mount(<TestComponent title="there" />);
    component.setProps({ title: 'yall' });
    expect(component.text()).toEqual('there');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1));
    });
    expect(component.text()).toEqual('yall');
  });
});
