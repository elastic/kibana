/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSelectableOption, EuiText } from '@elastic/eui';

import { MlModel, MlModelDeploymentState } from '../../../../../../../common/types/ml';
import { TrainedModelHealth } from '../ml_model_health';

import { LicenseBadge } from './license_badge';
import { ModelSelectOption } from './model_select_option';

const DEFAULT_PROPS: EuiSelectableOption<MlModel> = {
  modelId: 'model_1',
  type: 'ner',
  label: 'Model 1',
  title: 'Model 1',
  description: 'Model 1 description',
  licenseType: 'elastic',
  modelDetailsPageUrl: 'https://my-model.ai',
  deploymentState: MlModelDeploymentState.NotDeployed,
  startTime: 0,
  targetAllocationCount: 0,
  nodeAllocationCount: 0,
  threadsPerAllocation: 0,
  isPlaceholder: false,
  hasStats: false,
  types: ['pytorch', 'ner'],
  inputFieldNames: ['title'],
  version: '1',
};

describe('ModelSelectOption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
  });
  it('renders with license badge if present', () => {
    const wrapper = shallow(<ModelSelectOption {...DEFAULT_PROPS} />);
    expect(wrapper.find(LicenseBadge)).toHaveLength(1);
  });
  it('renders without license badge if not present', () => {
    const props = {
      ...DEFAULT_PROPS,
      licenseType: undefined,
    };

    const wrapper = shallow(<ModelSelectOption {...props} />);
    expect(wrapper.find(LicenseBadge)).toHaveLength(0);
  });
  it('renders with description if present', () => {
    const wrapper = shallow(<ModelSelectOption {...DEFAULT_PROPS} />);
    expect(wrapper.find(EuiText)).toHaveLength(1);
  });
  it('renders without description if not present', () => {
    const props = {
      ...DEFAULT_PROPS,
      description: undefined,
    };

    const wrapper = shallow(<ModelSelectOption {...props} />);
    expect(wrapper.find(EuiText)).toHaveLength(0);
  });
  it('renders status badge if there is no action button', () => {
    const wrapper = shallow(<ModelSelectOption {...DEFAULT_PROPS} />);
    expect(wrapper.find(TrainedModelHealth)).toHaveLength(1);
  });
});
