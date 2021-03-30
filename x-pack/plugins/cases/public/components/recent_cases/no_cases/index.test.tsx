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
  it('if no cases, you should be able to create a case by clicking on the link "start a new case"', () => {
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
