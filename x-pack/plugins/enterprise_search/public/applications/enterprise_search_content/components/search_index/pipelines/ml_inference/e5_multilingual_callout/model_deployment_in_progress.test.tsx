/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { E5MultilingualDismissButton } from './e5_multilingual_callout';
import { ModelDeploymentInProgress } from './model_deployment_in_progress';

const DEFAULT_VALUES = {
  startE5MultilingualModelError: undefined,
  isCreateButtonDisabled: false,
  isModelDownloadInProgress: false,
  isModelDownloaded: false,
  isModelStarted: false,
  isStartButtonDisabled: false,
};

describe('ModelDeploymentInProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
  });
  it('renders dismiss button if it is set to dismissable', () => {
    const wrapper = shallow(<ModelDeploymentInProgress dismiss={() => {}} isDismissable />);
    expect(wrapper.find(E5MultilingualDismissButton).length).toBe(1);
  });
  it('does not render dismiss button if it is set to non-dismissable', () => {
    const wrapper = shallow(<ModelDeploymentInProgress dismiss={() => {}} isDismissable={false} />);
    expect(wrapper.find(E5MultilingualDismissButton).length).toBe(0);
  });
});
