/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { DeployModel } from './deploy_model';
import { ModelDeployed } from './model_deployed';
import { ModelDeploymentInProgress } from './model_deployment_in_progress';
import { ModelStarted } from './model_started';
import { TextExpansionCallOut } from './text_expansion_callout';
import { TextExpansionErrors } from './text_expansion_errors';

jest.mock('./text_expansion_callout_data', () => ({
  useTextExpansionCallOutData: jest.fn(() => ({
    dismiss: jest.fn(),
    isCreateButtonDisabled: false,
    isDismissable: false,
    isStartButtonDisabled: false,
    show: true,
  })),
}));

const DEFAULT_VALUES = {
  isCreateButtonDisabled: false,
  isModelDownloadInProgress: false,
  isModelDownloaded: false,
  isModelStarted: false,
  isStartButtonDisabled: false,
};

describe('TextExpansionCallOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
  });
  it('renders error panel instead of normal panel if there are some errors', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      textExpansionError: {
        title: 'Error with ELSER deployment',
        message: 'Mocked error message',
      },
    });

    const wrapper = shallow(<TextExpansionCallOut />);
    expect(wrapper.find(TextExpansionErrors).length).toBe(1);
  });
  it('renders panel with deployment instructions if the model is not deployed', () => {
    const wrapper = shallow(<TextExpansionCallOut />);
    expect(wrapper.find(DeployModel).length).toBe(1);
  });
  it('renders panel with deployment in progress status if the model is being deployed', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      isModelDownloadInProgress: true,
    });

    const wrapper = shallow(<TextExpansionCallOut />);
    expect(wrapper.find(ModelDeploymentInProgress).length).toBe(1);
  });
  it('renders panel with deployment in progress status if the model has been deployed', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      isModelDownloaded: true,
    });

    const wrapper = shallow(<TextExpansionCallOut />);
    expect(wrapper.find(ModelDeployed).length).toBe(1);
  });
  it('renders panel with deployment in progress status if the model has been started', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      isModelStarted: true,
    });

    const wrapper = shallow(<TextExpansionCallOut />);
    expect(wrapper.find(ModelStarted).length).toBe(1);
  });
});
