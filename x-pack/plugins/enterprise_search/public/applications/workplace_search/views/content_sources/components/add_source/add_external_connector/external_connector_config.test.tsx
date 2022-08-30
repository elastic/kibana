/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../../../../__mocks__/react_router';
import { sourceConfigData } from '../../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSteps } from '@elastic/eui';

import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../../components/layout';

import { ExternalConnectorConfig } from './external_connector_config';
import { ExternalConnectorFormFields } from './external_connector_form_fields';

describe('ExternalConnectorConfig', () => {
  const setExternalConnectorApiKey = jest.fn();
  const setExternalConnectorUrl = jest.fn();
  const saveExternalConnectorConfig = jest.fn();

  const values = {
    sourceConfigData,
    buttonLoading: false,
    clientIdValue: 'foo',
    clientSecretValue: 'bar',
    baseUrlValue: 'http://foo.baz',
    hasPlatinumLicense: true,
    isOrganization: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions({
      setExternalConnectorApiKey,
      setExternalConnectorUrl,
      saveExternalConnectorConfig,
    });
    setMockValues({ ...values });
    mockUseParams.mockReturnValue({});
  });

  it('returns null if there is no matching source data for the service type', () => {
    mockUseParams.mockReturnValue({ baseServiceType: 'doesnt_exist' });

    const wrapper = shallow(<ExternalConnectorConfig />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders', () => {
    const wrapper = shallow(<ExternalConnectorConfig />);

    expect(wrapper.find(EuiSteps)).toHaveLength(1);
    expect(wrapper.find(EuiSteps).dive().find(ExternalConnectorFormFields)).toHaveLength(1);
  });

  it('renders organizstion layout', () => {
    const wrapper = shallow(<ExternalConnectorConfig />);

    expect(wrapper.find(WorkplaceSearchPageTemplate)).toHaveLength(1);
  });

  it('should show correct layout for personal dashboard', () => {
    setMockValues({ ...values, isOrganization: false });
    const wrapper = shallow(<ExternalConnectorConfig />);

    expect(wrapper.find(WorkplaceSearchPageTemplate)).toHaveLength(0);
    expect(wrapper.find(PersonalDashboardLayout)).toHaveLength(1);
  });

  it('handles form submission', () => {
    const wrapper = shallow(<ExternalConnectorConfig />);

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(saveExternalConnectorConfig).toHaveBeenCalled();
  });
});
