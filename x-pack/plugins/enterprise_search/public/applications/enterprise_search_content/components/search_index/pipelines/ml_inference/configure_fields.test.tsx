/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { ConfigureFields } from './configure_fields';
import { MultiFieldMapping, SelectedFieldMappings } from './multi_field_selector';

describe('ConfigureFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
  });

  const mockValues = {
    isTextExpansionModelSelected: false,
    addInferencePipelineModal: { configuration: { existingPipeline: false } },
  };

  it('renders multi-field selector components', () => {
    setMockValues({
      ...mockValues,
      isTextExpansionModelSelected: true,
    });
    const wrapper = shallow(<ConfigureFields />);
    expect(wrapper.find(MultiFieldMapping)).toHaveLength(1);
    expect(wrapper.find(SelectedFieldMappings)).toHaveLength(1);
  });
  it('only renders field mappings in read-only mode', () => {
    setMockValues({
      ...mockValues,
      isTextExpansionModelSelected: true,
      addInferencePipelineModal: { configuration: { existingPipeline: true } },
    });
    const wrapper = shallow(<ConfigureFields />);
    expect(wrapper.find(MultiFieldMapping)).toHaveLength(0);
    expect(wrapper.find(SelectedFieldMappings)).toHaveLength(1);
  });
});
