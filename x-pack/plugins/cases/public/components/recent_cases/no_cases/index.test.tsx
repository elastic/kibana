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

jest.mock('../../../common/navigation/hooks');

describe('NoCases', () => {
  it('if no cases, a link to create cases will exist', () => {
    const wrapper = mount(
      <TestProviders>
        <NoCases />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="no-cases-create-case"]`).first().prop('href')).toEqual(
      '/app/security/cases/create'
    );
  });

  it('displays a message without a link to create a case when the user does not have write permissions', () => {
    const wrapper = mount(
      <TestProviders userCanCrud={false}>
        <NoCases />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="no-cases-create-case"]`).exists()).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="no-cases-readonly"]`).exists()).toBeTruthy();
  });
});
