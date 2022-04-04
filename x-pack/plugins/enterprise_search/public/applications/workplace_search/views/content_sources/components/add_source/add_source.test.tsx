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
import { sourceConfigData } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';

import { staticSourceData } from '../../source_data';

import { AddSource } from './add_source';
import { AddSourceSteps } from './add_source_logic';
import { ConfigCompleted } from './config_completed';
import { ConfigurationChoice } from './configuration_choice';
import { ConfigurationIntro } from './configuration_intro';
import { ConfigureOauth } from './configure_oauth';
import { ConnectInstance } from './connect_instance';
import { Reauthenticate } from './reauthenticate';
import { SaveConfig } from './save_config';

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
    externalConfigured: false,
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
    const wrapper = shallow(<AddSource sourceData={staticSourceData[0]} />);
    wrapper.find(ConfigurationIntro).prop('advanceStep')();

    expect(setAddSourceStep).toHaveBeenCalledWith(AddSourceSteps.SaveConfigStep);
  });

  it('renders default state correctly when there are multiple connector options, but all connectors have been configured', () => {
    setMockValues({ ...mockValues, externalConfigured: true });
    const sourceData = {
      ...staticSourceData[0],
      externalConnectorAvailable: true,
      configured: true,
    };
    shallow(<AddSource sourceData={sourceData} />);
    expect(initializeAddSource).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ connect: true })
    );
  });

  it('renders default state correctly when there are not multiple connector options, and the connector has been configured', () => {
    const sourceData = {
      ...staticSourceData[0],
      externalConnectorAvailable: false,
      configured: true,
    };
    shallow(<AddSource sourceData={sourceData} />);
    expect(initializeAddSource).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ connect: true })
    );
  });

  it('renders default state correctly when there are multiple connector options', () => {
    const wrapper = shallow(
      <AddSource
        sourceData={{
          ...staticSourceData[0],
          externalConnectorAvailable: true,
          customConnectorAvailable: true,
          internalConnectorAvailable: true,
        }}
      />
    );
    wrapper.find(ConfigurationIntro).prop('advanceStep')();

    expect(setAddSourceStep).toHaveBeenCalledWith(AddSourceSteps.ChoiceStep);
  });

  it('renders default state correctly when there are multiple connector options but external connector is configured', () => {
    setMockValues({ ...mockValues, externalConfigured: true });
    const wrapper = shallow(
      <AddSource
        sourceData={{
          ...staticSourceData[0],
          externalConnectorAvailable: true,
          customConnectorAvailable: true,
          internalConnectorAvailable: true,
        }}
      />
    );
    wrapper.find(ConfigurationIntro).prop('advanceStep')();

    expect(setAddSourceStep).toHaveBeenCalledWith(AddSourceSteps.SaveConfigStep);
  });

  describe('layout', () => {
    it('renders the default workplace search layout when on an organization view', () => {
      setMockValues({ ...mockValues, isOrganization: true });
      const wrapper = shallow(<AddSource sourceData={staticSourceData[1]} />);

      expect(wrapper.type()).toEqual(WorkplaceSearchPageTemplate);
    });

    it('renders the personal dashboard layout when not in an organization', () => {
      setMockValues({ ...mockValues, isOrganization: false });
      const wrapper = shallow(<AddSource sourceData={staticSourceData[1]} />);

      expect(wrapper.type()).toEqual(PersonalDashboardLayout);
    });
  });

  it('renders a breadcrumb fallback while data is loading', () => {
    setMockValues({ ...mockValues, dataLoading: true, sourceConfigData: {} });
    const wrapper = shallow(<AddSource sourceData={staticSourceData[1]} />);

    expect(wrapper.prop('pageChrome')).toEqual(['Sources', 'Add Source', '...']);
  });

  it('renders Config Completed step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.ConfigCompletedStep,
    });
    const wrapper = shallow(<AddSource sourceData={staticSourceData[1]} />);
    expect(wrapper.find(ConfigCompleted).prop('showFeedbackLink')).toEqual(false);
    wrapper.find(ConfigCompleted).prop('advanceStep')();

    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/confluence_cloud/connect');
    expect(setAddSourceStep).toHaveBeenCalledWith(AddSourceSteps.ConnectInstanceStep);
  });

  it('renders Config Completed step with feedback for external connectors', () => {
    setMockValues({
      ...mockValues,
      sourceConfigData: { ...sourceConfigData, serviceType: 'external' },
      addSourceCurrentStep: AddSourceSteps.ConfigCompletedStep,
    });
    const wrapper = shallow(
      <AddSource sourceData={{ ...staticSourceData[1], serviceType: 'external' }} />
    );
    expect(wrapper.find(ConfigCompleted).prop('showFeedbackLink')).toEqual(true);

    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/confluence_cloud/connect');
    expect(setAddSourceStep).toHaveBeenCalledWith(AddSourceSteps.ConnectInstanceStep);
  });

  it('renders Save Config step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.SaveConfigStep,
    });
    const wrapper = shallow(<AddSource sourceData={staticSourceData[1]} />);
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
    const wrapper = shallow(<AddSource sourceData={staticSourceData[1]} connect />);
    wrapper.find(ConnectInstance).prop('onFormCreated')('foo');

    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/confluence_cloud/connect');
  });

  it('renders Configure Oauth step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.ConfigureOauthStep,
    });
    const wrapper = shallow(<AddSource sourceData={staticSourceData[1]} />);

    wrapper.find(ConfigureOauth).prop('onFormCreated')('foo');

    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/confluence_cloud/connect');
  });

  it('renders Reauthenticate step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.ReauthenticateStep,
    });
    const wrapper = shallow(<AddSource sourceData={staticSourceData[1]} />);

    expect(wrapper.find(Reauthenticate)).toHaveLength(1);
  });

  it('renders Config Choice step', () => {
    setMockValues({
      ...mockValues,
      addSourceCurrentStep: AddSourceSteps.ChoiceStep,
    });
    const wrapper = shallow(<AddSource sourceData={staticSourceData[1]} />);
    const advance = wrapper.find(ConfigurationChoice).prop('goToInternalStep');
    expect(advance).toBeDefined();
    if (advance) {
      advance();
    }

    expect(setAddSourceStep).toHaveBeenCalledWith(AddSourceSteps.SaveConfigStep);
  });
});
