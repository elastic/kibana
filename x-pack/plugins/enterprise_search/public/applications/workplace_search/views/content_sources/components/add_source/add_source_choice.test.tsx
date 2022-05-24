/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, mockKibanaValues } from '../../../../../__mocks__/kea_logic';

import { mockUseParams } from '../../../../../__mocks__/react_router';

import React from 'react';

import { shallow } from 'enzyme';

import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';

import { getSourceData } from '../../source_data';

import { AddSourceChoice } from './add_source_choice';
import { ConfigurationChoice } from './configuration_choice';

describe('AddSourceChoice', () => {
  const { navigateToUrl } = mockKibanaValues;

  const mockValues = {
    isOrganization: true,
    hasPlatinumLicense: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ serviceType: 'share_point' });
  });

  it('returns null if there is no matching source data for the service type', () => {
    mockUseParams.mockReturnValue({ serviceType: 'doesnt_exist' });
    setMockValues(mockValues);

    const wrapper = shallow(<AddSourceChoice />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('redirects to root add source path if user does not have a platinum license and the service is account context only', () => {
    mockUseParams.mockReturnValue({ serviceType: 'slack' });
    setMockValues({ ...mockValues, hasPlatinumLicense: false });

    shallow(<AddSourceChoice />);

    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add');
  });

  describe('layout', () => {
    it('renders the default workplace search layout when on an organization view', () => {
      setMockValues({ ...mockValues, isOrganization: true });
      const wrapper = shallow(<AddSourceChoice />);

      expect(wrapper.type()).toEqual(WorkplaceSearchPageTemplate);
    });

    it('renders the personal dashboard layout when not in an organization', () => {
      setMockValues({ ...mockValues, isOrganization: false });
      const wrapper = shallow(<AddSourceChoice />);

      expect(wrapper.type()).toEqual(PersonalDashboardLayout);
    });
  });

  it('renders Config Choice step', () => {
    setMockValues(mockValues);
    const wrapper = shallow(<AddSourceChoice />);

    expect(wrapper.find(ConfigurationChoice).prop('sourceData')).toEqual(
      getSourceData('share_point')
    );
  });
});
