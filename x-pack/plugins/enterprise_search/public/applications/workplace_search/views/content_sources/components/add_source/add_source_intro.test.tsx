/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';

import { getSourceData, staticSourceData } from '../../source_data';

import { AddSourceIntro } from './add_source_intro';
import { ConfigurationIntro } from './configuration_intro';

describe('AddSourceList', () => {
  const mockValues = {
    isOrganization: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the user to a choice view when there are multiple connector options', () => {
    setMockValues(mockValues);
    // @ts-ignore
    const wrapper = shallow(<AddSourceIntro sourceData={getSourceData('share_point')} />);

    expect(wrapper.find(ConfigurationIntro).prop('advanceStepTo')).toEqual(
      '/sources/add/share_point/choice'
    );
  });

  it('sends the user to a connector config view when it is an external connector without multiple options', () => {
    setMockValues(mockValues);
    // @ts-ignore
    const wrapper = shallow(<AddSourceIntro sourceData={getSourceData('external')} />);

    expect(wrapper.find(ConfigurationIntro).prop('advanceStepTo')).toEqual(
      '/sources/add/external/connector_registration'
    );
  });

  it('sends the user to the add source view by default', () => {
    setMockValues(mockValues);
    // @ts-ignore
    const wrapper = shallow(<AddSourceIntro sourceData={getSourceData('slack')} />);

    expect(wrapper.find(ConfigurationIntro).prop('advanceStepTo')).toEqual('/sources/add/slack/');
  });

  describe('layout', () => {
    it('renders the default workplace search layout when on an organization view', () => {
      setMockValues({ ...mockValues, isOrganization: true });
      const wrapper = shallow(<AddSourceIntro sourceData={staticSourceData[1]} />);

      expect(wrapper.type()).toEqual(WorkplaceSearchPageTemplate);
    });

    it('renders the personal dashboard layout when not in an organization', () => {
      setMockValues({ ...mockValues, isOrganization: false });
      const wrapper = shallow(<AddSourceIntro sourceData={staticSourceData[1]} />);

      expect(wrapper.type()).toEqual(PersonalDashboardLayout);
    });
  });
});
