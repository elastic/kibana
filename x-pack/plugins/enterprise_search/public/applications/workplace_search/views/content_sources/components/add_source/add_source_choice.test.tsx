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

import { staticSourceData } from '../../source_data';

import { AddSourceChoice } from './add_source_choice';
import { ConfigurationChoice } from './configuration_choice';

describe('AddSourceChoice', () => {
  const mockValues = {
    isOrganization: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('layout', () => {
    it('renders the default workplace search layout when on an organization view', () => {
      setMockValues({ ...mockValues, isOrganization: true });
      const wrapper = shallow(<AddSourceChoice sourceData={staticSourceData[1]} />);

      expect(wrapper.type()).toEqual(WorkplaceSearchPageTemplate);
    });

    it('renders the personal dashboard layout when not in an organization', () => {
      setMockValues({ ...mockValues, isOrganization: false });
      const wrapper = shallow(<AddSourceChoice sourceData={staticSourceData[1]} />);

      expect(wrapper.type()).toEqual(PersonalDashboardLayout);
    });
  });

  it('renders Config Choice step', () => {
    setMockValues(mockValues);
    const wrapper = shallow(<AddSourceChoice sourceData={staticSourceData[1]} />);

    expect(wrapper.find(ConfigurationChoice).prop('sourceData')).toEqual(staticSourceData[1]);
  });
});
