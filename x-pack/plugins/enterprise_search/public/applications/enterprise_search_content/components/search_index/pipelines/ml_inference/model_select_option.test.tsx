/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiLink, EuiText } from '@elastic/eui';

import { MlModelDeploymentState } from '../../../../../../../common/types/ml';
import { TrainedModelHealth } from '../ml_model_health';

import {
  DeployModelButton,
  getContextMenuPanel,
  LicenseBadge,
  ModelSelectOption,
  ModelSelectOptionProps,
  StartModelButton,
} from './model_select_option';

const DEFAULT_PROPS: ModelSelectOptionProps = {
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
  it('renders deploy button for a model placeholder', () => {
    const props = {
      ...DEFAULT_PROPS,
      isPlaceholder: true,
    };

    const wrapper = shallow(<ModelSelectOption {...props} />);
    expect(wrapper.find(DeployModelButton)).toHaveLength(1);
  });
  it('renders start button for a downloaded model', () => {
    const props = {
      ...DEFAULT_PROPS,
      deploymentState: MlModelDeploymentState.Downloaded,
    };

    const wrapper = shallow(<ModelSelectOption {...props} />);
    expect(wrapper.find(StartModelButton)).toHaveLength(1);
  });
  it('renders status badge if there is no action button', () => {
    const wrapper = shallow(<ModelSelectOption {...DEFAULT_PROPS} />);
    expect(wrapper.find(TrainedModelHealth)).toHaveLength(1);
  });
});

describe('LicenseBadge', () => {
  it('renders with link if URL is present', () => {
    const wrapper = shallow(
      <LicenseBadge
        licenseType={DEFAULT_PROPS.licenseType!}
        modelDetailsPageUrl={DEFAULT_PROPS.modelDetailsPageUrl}
      />
    );
    expect(wrapper.find(EuiLink)).toHaveLength(1);
  });
  it('renders without link if URL is not present', () => {
    const wrapper = shallow(<LicenseBadge licenseType={DEFAULT_PROPS.licenseType!} />);
    expect(wrapper.find(EuiLink)).toHaveLength(0);
  });
});

describe('getContextMenuPanel', () => {
  it('gets model details link if URL is present', () => {
    const panels = getContextMenuPanel('https://model.ai');
    expect(panels[0].items).toHaveLength(2);
  });
});
