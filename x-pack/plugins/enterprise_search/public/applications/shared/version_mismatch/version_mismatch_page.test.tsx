/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { VersionMismatchError } from './version_mismatch_error';
import { VersionMismatchPage } from './version_mismatch_page';

describe('VersionMismatchPage', () => {
  it('renders', () => {
    const wrapper = shallow(
      <VersionMismatchPage kibanaVersion="8.1.0" enterpriseSearchVersion="8.0.0" />
    );
    expect(wrapper.find(VersionMismatchError).exists()).toBe(true);
    expect(wrapper.find(VersionMismatchError).props()).toEqual({
      kibanaVersion: '8.1.0',
      enterpriseSearchVersion: '8.0.0',
    });
  });
});
