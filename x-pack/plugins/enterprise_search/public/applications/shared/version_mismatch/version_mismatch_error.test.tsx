/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mount } from 'enzyme';

import { VersionMismatchError } from './version_mismatch_error';

describe('VersionMismatchError', () => {
  it('renders', () => {
    const wrapper = mount(
      <VersionMismatchError kibanaVersion="8.1.0" enterpriseSearchVersion="8.0.0" />
    );

    expect(wrapper.find('EuiEmptyPrompt').text()).toContain('Enterprise Search version: 8.0.0');
    expect(wrapper.find('EuiEmptyPrompt').text()).toContain('Kibana version: 8.1.0');
  });
});
