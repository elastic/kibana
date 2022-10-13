/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PageRoute } from './pageroute';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';

describe('pageroute', () => {
  const documentTitle = 'Kibana';

  const fakeComponent = () => <div className="fakeComponent">{'fake component'}</div>;
  let wrapper: ReactWrapper;
  beforeAll(() => {
    wrapper = mount(<PageRoute title="test" component={fakeComponent} />);
  });

  afterAll(() => {
    document.title = documentTitle;
  });

  test('renders target component correctly', () => {
    expect(wrapper.find(fakeComponent)).toBeTruthy();
  });

  test('updates page title correctly', () => {
    expect(document.title).toEqual('test - Kibana');
  });
});
