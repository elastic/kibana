/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';
import { Redirect } from 'react-router-dom';

import { shallow } from 'enzyme';

import { ADD_SOURCE_PATH, PRIVATE_SOURCES_PATH, SOURCES_PATH, getSourcesPath } from '../../routes';

import { staticSourceData } from './source_data';
import { SourcesRouter } from './sources_router';

describe('SourcesRouter', () => {
  const resetSourcesState = jest.fn();
  const mockValues = {
    account: { canCreatePrivateSources: true },
    isOrganization: true,
    hasPlatinumLicense: true,
  };

  const externalSourceCount = staticSourceData.filter(
    (sourceData) => sourceData.serviceType === 'external'
  ).length;

  const customSourceCount = staticSourceData.filter(
    (sourceData) => sourceData.serviceType === 'custom'
  ).length;

  const internalSourceCount = staticSourceData.filter(
    (sourceData) => sourceData.serviceType !== 'custom' && sourceData.serviceType !== 'external'
  ).length;

  const needsConfigSourceCount = staticSourceData.filter(
    (sourceData) => sourceData.configuration.needsConfiguration === true
  ).length;

  beforeEach(() => {
    setMockActions({
      resetSourcesState,
    });
    setMockValues({ ...mockValues });
  });

  // it('renders sources routes', () => {
  //   const TOTAL_ROUTES = 103;
  //   const wrapper = shallow(<SourcesRouter />);

  //   expect(wrapper.find(Switch)).toHaveLength(1);
  //   expect(wrapper.find(Route)).toHaveLength(TOTAL_ROUTES);
  // });

  it('renders a connector choice view for every internal source', () => {
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find('[data-test-subj="ConnectorChoiceRoute"]')).toHaveLength(
      internalSourceCount
    );
  });

  it('renders an intro view for every internal and external source', () => {
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find('[data-test-subj="ConnectorIntroRoute"]')).toHaveLength(
      internalSourceCount + externalSourceCount
    );
  });

  it('renders an add source view for every internal and external source', () => {
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find('[data-test-subj="AddSourceRoute"]')).toHaveLength(
      internalSourceCount + externalSourceCount
    );
  });

  it('renders a connect source view for every internal and external source', () => {
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find('[data-test-subj="AddSourceConnectRoute"]')).toHaveLength(
      internalSourceCount + externalSourceCount
    );
  });

  it('renders a reaauthenticate connnector view for every internal and external source', () => {
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find('[data-test-subj="AddSourceReauthenticateRoute"]')).toHaveLength(
      internalSourceCount + externalSourceCount
    );
  });

  it('renders a configure connnector view for every sources that needs configuration', () => {
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find('[data-test-subj="AddSourceConfigureRoute"]')).toHaveLength(
      needsConfigSourceCount
    );
  });

  it('renders an external connnector config view for every external source', () => {
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find('[data-test-subj="ExternalConnectorConfigRoute"]')).toHaveLength(
      externalSourceCount
    );
  });

  it('renders an add custom source view for every custom source, plus a default', () => {
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find('[data-test-subj="AddCustomSourceRoute"]')).toHaveLength(
      customSourceCount + 1
    );
  });

  it('redirects when nonplatinum license and accountOnly context', () => {
    setMockValues({ ...mockValues, hasPlatinumLicense: false });
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find(Redirect).last().prop('from')).toEqual(ADD_SOURCE_PATH);
    expect(wrapper.find(Redirect).last().prop('to')).toEqual(SOURCES_PATH);
  });

  it('redirects when cannot create sources', () => {
    setMockValues({ ...mockValues, account: { canCreatePrivateSources: false } });
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find(Redirect).last().prop('from')).toEqual(
      getSourcesPath(ADD_SOURCE_PATH, false)
    );
    expect(wrapper.find(Redirect).last().prop('to')).toEqual(PRIVATE_SOURCES_PATH);
  });

  it('does not render the router until canCreatePrivateSources is fetched', () => {
    setMockValues({ ...mockValues, account: {} }); // canCreatePrivateSources is undefined
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.html()).toEqual(null);
  });
});
