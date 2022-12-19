/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../common/mock';
import type { MappingProps } from './mapping';
import { Mapping } from './mapping';
import { mappings } from './__mock__';
import { ConnectorTypes } from '../../../common/api';

describe('Mapping', () => {
  const props: MappingProps = {
    actionTypeName: 'ServiceNow ITSM',
    connectorType: ConnectorTypes.serviceNowITSM,
    isLoading: false,
    mappings,
  };

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

  test('displays the title correctly', () => {
    const wrapper = mount(<Mapping {...props} />, { wrappingComponent: TestProviders });
    expect(wrapper.find('[data-test-subj="field-mapping-text"] h4').first().text()).toBe(
      'ServiceNow ITSM field mappings'
    );
  });

  test('displays the description correctly', () => {
    const wrapper = mount(<Mapping {...props} />, { wrappingComponent: TestProviders });
    expect(wrapper.find('[data-test-subj="field-mapping-desc"]').first().text()).toBe(
      'Map Case fields to ServiceNow ITSM fields when pushing data to ServiceNow ITSM. Field mappings require an established connection to ServiceNow ITSM.'
    );
  });

  test('displays connection warning when isLoading: false and mappings: []', () => {
    const wrapper = mount(<Mapping {...{ ...props, mappings: [] }} />, {
      wrappingComponent: TestProviders,
    });
    expect(wrapper.find('[data-test-subj="field-mapping-desc"]').first().text()).toBe(
      'Failed to retrieve mappings for ServiceNow ITSM.'
    );
  });
});
