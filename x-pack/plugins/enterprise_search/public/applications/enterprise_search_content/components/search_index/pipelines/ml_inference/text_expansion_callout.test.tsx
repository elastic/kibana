/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';
import React from 'react';
import { shallow } from 'enzyme';
import { EuiButton, EuiText } from '@elastic/eui';
import { HttpError } from '../../../../../../../common/types/api';
import {
  TextExpansionCallOut,
  ModelDeployed,
  TextExpansionDismissButton,
  ModelStarted,
  FineTuneModelsButton,
} from './text_expansion_callout';
import { DeployModel } from './deploy_model';
import { TextExpansionErrors } from './text_expansion_errors';
import { ModelDeploymentInProgress } from './model_deployment_in_progress';

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
  startTextExpansionModelError: undefined,
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
      startTextExpansionModelError: {
        body: {
          error: 'some-error',
          message: 'some-error-message',
          statusCode: 500,
        },
      } as HttpError,
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

  describe('DeployModel', () => {
    it('renders deploy button', () => {
      const wrapper = shallow(
        <DeployModel
          dismiss={() => {}}
          ingestionMethod="crawler"
          isCreateButtonDisabled={false}
          isDismissable={false}
        />
      );
      expect(wrapper.find(EuiButton).length).toBe(1);
      const button = wrapper.find(EuiButton);
      expect(button.prop('disabled')).toBe(false);
    });
    it('renders disabled deploy button if it is set to disabled', () => {
      const wrapper = shallow(
        <DeployModel
          dismiss={() => {}}
          ingestionMethod="crawler"
          isCreateButtonDisabled
          isDismissable={false}
        />
      );
      expect(wrapper.find(EuiButton).length).toBe(1);
      const button = wrapper.find(EuiButton);
      expect(button.prop('disabled')).toBe(true);
    });
    it('renders dismiss button if it is set to dismissable', () => {
      const wrapper = shallow(
        <DeployModel
          dismiss={() => {}}
          ingestionMethod="crawler"
          isCreateButtonDisabled={false}
          isDismissable
        />
      );
      expect(wrapper.find(TextExpansionDismissButton).length).toBe(1);
    });
    it('does not render dismiss button if it is set to non-dismissable', () => {
      const wrapper = shallow(
        <DeployModel
          dismiss={() => {}}
          ingestionMethod="crawler"
          isCreateButtonDisabled={false}
          isDismissable={false}
        />
      );
      expect(wrapper.find(TextExpansionDismissButton).length).toBe(0);
    });
  });

  describe('ModelStarted', () => {
    it('renders dismiss button if it is set to dismissable', () => {
      const wrapper = shallow(
        <ModelStarted dismiss={() => {}} isCompact={false} isDismissable isSingleThreaded />
      );
      expect(wrapper.find(TextExpansionDismissButton).length).toBe(1);
    });
    it('does not render dismiss button if it is set to non-dismissable', () => {
      const wrapper = shallow(
        <ModelStarted dismiss={() => {}} isCompact={false} isDismissable={false} isSingleThreaded />
      );
      expect(wrapper.find(TextExpansionDismissButton).length).toBe(0);
    });
    it('renders fine-tune button if the model is running single-threaded', () => {
      const wrapper = shallow(
        <ModelStarted dismiss={() => {}} isCompact={false} isDismissable isSingleThreaded />
      );
      expect(wrapper.find(FineTuneModelsButton).length).toBe(1);
    });
    it('does not render description if it is set to compact', () => {
      const wrapper = shallow(
        <ModelStarted dismiss={() => {}} isCompact isDismissable isSingleThreaded />
      );
      expect(wrapper.find(EuiText).length).toBe(1); // Title only
    });
  });
});
