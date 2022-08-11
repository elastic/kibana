/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import {
  mockKibanaValues,
  setMockActions,
  setMockValues,
} from '../../../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../../../__mocks__/react_router';
import { sourceConfigData } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';

import { AddSource } from './add_source';
import { AddSourceSteps } from './add_source_logic';
import { ConfigCompleted } from './config_completed';
import { ConfigureOauth } from './configure_oauth';
import { ConnectInstance } from './connect_instance';
import { Reauthenticate } from './reauthenticate';
import { SaveConfig } from './save_config';

describe('AddSourceList', () => {
  const { navigateToUrl } = mockKibanaValues;
  const getSourceConfigData = jest.fn();
  const setAddSourceStep = jest.fn();
  const saveSourceConfig = jest.fn((_, setConfigCompletedStep) => {
    setConfigCompletedStep();
  });
  const createContentSource = jest.fn((_, formSubmitSuccess) => {
    formSubmitSuccess();
  });
  const resetSourcesState = jest.fn();

  const mockValues = {
    addSourceCurrentStep: null,
    sourceConfigData,
    dataLoading: false,
    newCustomSource: {},
    isOrganization: true,
    externalConfigured: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions({
      getSourceConfigData,
      setAddSourceStep,
      saveSourceConfig,
      createContentSource,
      resetSourcesState,
    });
    setMockValues(mockValues);
    mockUseParams.mockReturnValue({ serviceType: 'box' });
  });

  describe('layout', () => {
    it('renders the default workplace search layout when on an organization view', () => {
      setMockValues({ ...mockValues, isOrganization: true });
      const wrapper = shallow(<AddSource />);

      expect(wrapper.type()).toEqual(WorkplaceSearchPageTemplate);
    });

    it('renders the personal dashboard layout when not in an organization', () => {
      setMockValues({ ...mockValues, isOrganization: false });
      const wrapper = shallow(<AddSource />);

      expect(wrapper.type()).toEqual(PersonalDashboardLayout);
    });
  });

  it('renders a breadcrumb fallback while data is loading', () => {
    setMockValues({ ...mockValues, dataLoading: true, sourceConfigData: {} });
    const wrapper = shallow(<AddSource />);

    expect(wrapper.prop('pageChrome')).toEqual(['Sources', 'Add Source', '...']);
  });

  it('renders Config Completed step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.ConfigCompletedStep,
    });
    const wrapper = shallow(<AddSource />);
    expect(wrapper.find(ConfigCompleted).prop('showFeedbackLink')).toEqual(false);
    wrapper.find(ConfigCompleted).prop('advanceStep')();

    expect(setAddSourceStep).toHaveBeenCalledWith(AddSourceSteps.ConnectInstanceStep);
  });

  it('renders Config Completed step with feedback for external connectors', () => {
    mockUseParams.mockReturnValue({ serviceType: 'external' });
    setMockValues({
      ...mockValues,
      sourceConfigData: { ...sourceConfigData, serviceType: 'external' },
      addSourceCurrentStep: AddSourceSteps.ConfigCompletedStep,
    });
    const wrapper = shallow(<AddSource />);
    expect(wrapper.find(ConfigCompleted).prop('showFeedbackLink')).toEqual(true);
    wrapper.find(ConfigCompleted).prop('advanceStep')();

    expect(setAddSourceStep).toHaveBeenCalledWith(AddSourceSteps.ConnectInstanceStep);
  });

  it('renders Save Config step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.SaveConfigStep,
    });
    const wrapper = shallow(<AddSource />);
    const saveConfig = wrapper.find(SaveConfig);
    saveConfig.prop('advanceStep')();
    expect(saveSourceConfig).toHaveBeenCalled();

    saveConfig.prop('goBackStep')!();
    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/box/intro');
  });

  it('renders Connect Instance step', () => {
    setMockValues({
      ...mockValues,
      sourceConfigData,
      addSourceCurrentStep: AddSourceSteps.ConnectInstanceStep,
    });

    const wrapper = shallow(<AddSource />);
    wrapper.find(ConnectInstance).prop('onFormCreated')('foo');

    expect(navigateToUrl).toHaveBeenCalledWith('/sources');
  });

  it('renders Configure Oauth step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.ConfigureOauthStep,
    });
    const wrapper = shallow(<AddSource />);

    wrapper.find(ConfigureOauth).prop('onFormCreated')('foo');

    expect(navigateToUrl).toHaveBeenCalledWith('/sources');
  });

  it('renders Reauthenticate step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.ReauthenticateStep,
    });
    const wrapper = shallow(<AddSource />);

    expect(wrapper.find(Reauthenticate)).toHaveLength(1);
  });
});
