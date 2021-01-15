/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { mockKibanaValues, setMockActions, setMockValues } from '../../../../../__mocks__';

import { sourceConfigData } from '../../../../__mocks__/content_sources.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { Loading } from '../../../../../shared/loading';

import { AddSource } from './add_source';
import { AddSourceSteps } from './add_source_logic';
import { ConfigCompleted } from './config_completed';
import { ConfigurationIntro } from './configuration_intro';
import { ConfigureCustom } from './configure_custom';
import { ConfigureOauth } from './configure_oauth';
import { ConnectInstance } from './connect_instance';
import { ReAuthenticate } from './re_authenticate';
import { SaveConfig } from './save_config';
import { SaveCustom } from './save_custom';

describe('AddSourceList', () => {
  const { navigateToUrl } = mockKibanaValues;
  const initializeAddSource = jest.fn();
  const setAddSourceStep = jest.fn();
  const saveSourceConfig = jest.fn((_, setConfigCompletedStep) => {
    setConfigCompletedStep();
  });
  const createContentSource = jest.fn((_, formSubmitSuccess) => {
    formSubmitSuccess();
  });
  const resetSourcesState = jest.fn();

  const mockValues = {
    addSourceCurrentStep: AddSourceSteps.ConfigIntroStep,
    sourceConfigData,
    dataLoading: false,
    newCustomSource: {},
    isOrganization: true,
  };

  beforeEach(() => {
    setMockActions({
      initializeAddSource,
      setAddSourceStep,
      saveSourceConfig,
      createContentSource,
      resetSourcesState,
    });
    setMockValues(mockValues);
  });

  it('renders default state', () => {
    const wrapper = shallow(<AddSource sourceIndex={1} />);
    wrapper.find(ConfigurationIntro).prop('advanceStep')();

    expect(setAddSourceStep).toHaveBeenCalledWith(AddSourceSteps.SaveConfigStep);
  });

  it('handles loading state', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<AddSource sourceIndex={1} />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('renders Config Completed step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.ConfigCompletedStep,
    });
    const wrapper = shallow(<AddSource sourceIndex={1} />);
    wrapper.find(ConfigCompleted).prop('advanceStep')();

    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/confluence_cloud/connect');
    expect(setAddSourceStep).toHaveBeenCalledWith(AddSourceSteps.ConnectInstanceStep);
  });

  it('renders Save Config step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.SaveConfigStep,
    });
    const wrapper = shallow(<AddSource sourceIndex={1} />);
    const saveConfig = wrapper.find(SaveConfig);
    saveConfig.prop('advanceStep')();
    saveConfig.prop('goBackStep')!();

    expect(setAddSourceStep).toHaveBeenCalledWith(AddSourceSteps.ConfigIntroStep);
    expect(saveSourceConfig).toHaveBeenCalled();
  });

  it('renders Connect Instance step', () => {
    setMockValues({
      ...mockValues,
      sourceConfigData,
      addSourceCurrentStep: AddSourceSteps.ConnectInstanceStep,
    });
    const wrapper = shallow(<AddSource sourceIndex={1} connect />);
    wrapper.find(ConnectInstance).prop('onFormCreated')('foo');

    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/confluence_cloud/connect');
  });

  it('renders Configure Custom step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.ConfigureCustomStep,
    });
    const wrapper = shallow(<AddSource sourceIndex={1} />);
    wrapper.find(ConfigureCustom).prop('advanceStep')();

    expect(createContentSource).toHaveBeenCalled();
  });

  it('renders Configure Oauth step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.ConfigureOauthStep,
    });
    const wrapper = shallow(<AddSource sourceIndex={1} />);

    wrapper.find(ConfigureOauth).prop('onFormCreated')('foo');

    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/confluence_cloud/connect');
  });

  it('renders Save Custom step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.SaveCustomStep,
    });
    const wrapper = shallow(<AddSource sourceIndex={1} />);

    expect(wrapper.find(SaveCustom)).toHaveLength(1);
  });

  it('renders ReAuthenticate step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.ReAuthenticateStep,
    });
    const wrapper = shallow(<AddSource sourceIndex={1} />);

    expect(wrapper.find(ReAuthenticate)).toHaveLength(1);
  });
});
