/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import {
  TextExpansionCallOut,
  DeployModel,
  ModelDeploymentInProgress,
  ModelDeployed,
  TextExpansionDismissButton,
} from './text_expansion_callout';
import { EuiButton } from '@elastic/eui';

jest.mock('./text_expansion_callout_data', () => ({
  useTextExpansionCallOutData: jest.fn(() => ({
    dismiss: jest.fn(),
    isCreateButtonDisabled: false,
    isDismissable: false,
    show: true,
  })),
}));

const DEFAULT_VALUES = {
  isCreateButtonDisabled: false,
  isModelDownloadInProgress: false,
  isModelDownloaded: false,
};

describe('TextExpansionCallOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
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

  describe('DeployModel', () => {
    it('renders deploy button', () => {
      const wrapper = shallow(
        <DeployModel dismiss={() => {}} isCreateButtonDisabled={false} isDismissable={false} />
      );
      expect(wrapper.find(EuiButton).length).toBe(1);
      const button = wrapper.find(EuiButton);
      expect(button.prop('disabled')).toBe(false);
    });
    it('renders disabled deploy button if it is set to disabled', () => {
      const wrapper = shallow(
        <DeployModel dismiss={() => {}} isCreateButtonDisabled isDismissable={false} />
      );
      expect(wrapper.find(EuiButton).length).toBe(1);
      const button = wrapper.find(EuiButton);
      expect(button.prop('disabled')).toBe(true);
    });
    it('renders dismiss button if it is set to dismissable', () => {
      const wrapper = shallow(
        <DeployModel dismiss={() => {}} isCreateButtonDisabled={false} isDismissable />
      );
      expect(wrapper.find(TextExpansionDismissButton).length).toBe(1);
    });
    it('does not render dismiss button if it is set to non-dismissable', () => {
      const wrapper = shallow(
        <DeployModel dismiss={() => {}} isCreateButtonDisabled={false} isDismissable={false} />
      );
      expect(wrapper.find(TextExpansionDismissButton).length).toBe(0);
    });
  });

  describe('ModelDeploymentInProgress', () => {
    it('renders dismiss button if it is set to dismissable', () => {
      const wrapper = shallow(<ModelDeploymentInProgress dismiss={() => {}} isDismissable />);
      expect(wrapper.find(TextExpansionDismissButton).length).toBe(1);
    });
    it('does not render dismiss button if it is set to non-dismissable', () => {
      const wrapper = shallow(
        <ModelDeploymentInProgress dismiss={() => {}} isDismissable={false} />
      );
      expect(wrapper.find(TextExpansionDismissButton).length).toBe(0);
    });
  });

  describe('ModelDeployed', () => {
    it('renders dismiss button if it is set to dismissable', () => {
      const wrapper = shallow(<ModelDeployed dismiss={() => {}} isDismissable />);
      expect(wrapper.find(TextExpansionDismissButton).length).toBe(1);
    });
    it('does not render dismiss button if it is set to non-dismissable', () => {
      const wrapper = shallow(<ModelDeployed dismiss={() => {}} isDismissable={false} />);
      expect(wrapper.find(TextExpansionDismissButton).length).toBe(0);
    });
  });
});
