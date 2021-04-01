/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../common/mock';
import { NoCases } from '.';

describe('RecentCases', () => {
  it('if no cases, a link to create cases will exist', () => {
    const createCaseHref = '/create';
    const wrapper = mount(
      <TestProviders>
        <NoCases createCaseHref={createCaseHref} />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="no-cases-create-case"]`).first().prop('href')).toEqual(
      createCaseHref
    );
  });
});
