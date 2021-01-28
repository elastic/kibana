/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../common/mock';
import { Mapping, MappingProps } from './mapping';
import { mappings } from './__mock__';

describe('Mapping', () => {
  const props: MappingProps = {
    connectorActionTypeId: '.servicenow',
    isLoading: false,
    mappings,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('it shows mapping form group', () => {
    const wrapper = mount(<Mapping {...props} />, { wrappingComponent: TestProviders });
    expect(wrapper.find('[data-test-subj="static-mappings"]').first().exists()).toBe(true);
  });

  test('correctly maps fields', () => {
    const wrapper = mount(<Mapping {...props} />, { wrappingComponent: TestProviders });
    expect(wrapper.find('[data-test-subj="field-mapping-source"] code').first().text()).toBe(
      'title'
    );
    expect(wrapper.find('[data-test-subj="field-mapping-target"] code').first().text()).toBe(
      'short_description'
    );
  });
  test('displays connection warning when isLoading: false and mappings: []', () => {
    const wrapper = mount(<Mapping {...{ ...props, mappings: [] }} />, {
      wrappingComponent: TestProviders,
    });
    expect(wrapper.find('[data-test-subj="field-mapping-desc"]').first().text()).toBe(
      'Field mappings require an established connection to ServiceNow. Please check your connection credentials.'
    );
  });
});
