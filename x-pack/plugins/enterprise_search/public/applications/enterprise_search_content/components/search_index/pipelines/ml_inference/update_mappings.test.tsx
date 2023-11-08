/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable } from '@elastic/eui';

import {
  UpdateMappings,
  UpdateMappingsAutomatic,
  UpdateMappingsInstructions,
} from './update_mappings';

describe('UpdateMappings', () => {
  const DEFAULT_VALUES = {
    isTextExpansionModelSelected: false,
    addInferencePipelineModal: { configuration: { existingPipeline: false } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
  });
  it('renders selected fields', () => {
    const wrapper = shallow(<UpdateMappings />);
    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);
  });
  it('renders instructions if mappings need to be updated manually', () => {
    const wrapper = shallow(<UpdateMappings />);
    expect(wrapper.find(UpdateMappingsInstructions)).toHaveLength(1);
  });
  it('renders instructions when attaching existing pipeline', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: { configuration: { existingPipeline: true } },
    });
    const wrapper = shallow(<UpdateMappings />);
    expect(wrapper.find(UpdateMappingsInstructions)).toHaveLength(1);
  });
  it('renders info panel if text expansion model is selected', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      isTextExpansionModelSelected: true,
    });
    const wrapper = shallow(<UpdateMappings />);
    expect(wrapper.find(UpdateMappingsAutomatic)).toHaveLength(1);
  });
});
