/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ActionBarStatusItem } from './action_bar_status_item';

describe('ActionBarStatusItem', () => {
  it('should correctly render ActionBarStatusItem', () => {
    const title = 'Title';
    const status = 'Online';

    const wrapper = mount(
      <ActionBarStatusItem title={title}>
        <span>{status}</span>
      </ActionBarStatusItem>
    );

    const titleElement = wrapper.find('strong');

    expect(titleElement.exists()).toBeTruthy();
    expect(titleElement.text()).toBe(title);

    const childrenElement = wrapper.find(`span`);

    expect(childrenElement.exists()).toBeTruthy();
    expect(childrenElement.text()).toBe(status);
  });
});
