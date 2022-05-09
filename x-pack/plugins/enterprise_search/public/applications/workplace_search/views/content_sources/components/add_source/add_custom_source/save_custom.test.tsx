/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButtonTo } from '../../../../../../shared/react_router_helpers';

import { staticCustomSourceData } from '../../../source_data';

import { CustomSourceDeployment } from '../../custom_source_deployment';

import { SaveCustom } from './save_custom';

const mockValues = {
  newCustomSource: {
    id: 'id',
    accessToken: 'token',
    name: 'name',
  },
  sourceData: staticCustomSourceData,
};

describe('SaveCustom', () => {
  describe('default behavior', () => {
    let wrapper: ShallowWrapper;

    beforeAll(() => {
      jest.clearAllMocks();
      setMockValues(mockValues);

      wrapper = shallow(<SaveCustom />);
    });

    it('contains a button back to the sources list', () => {
      expect(wrapper.find(EuiButtonTo)).toHaveLength(1);
    });

    it('includes deployment instructions', () => {
      expect(wrapper.find(CustomSourceDeployment)).toHaveLength(1);
    });
  });

  describe('for pre-configured custom sources', () => {
    let wrapper: ShallowWrapper;

    beforeAll(() => {
      jest.clearAllMocks();
      setMockValues({
        ...mockValues,
        sourceData: {
          ...staticCustomSourceData,
          serviceType: 'sharepoint-server',
          configuration: {
            ...staticCustomSourceData.configuration,
            githubRepository: 'elastic/sharepoint-server-connector',
          },
        },
      });

      wrapper = shallow(<SaveCustom />);
    });

    it('includes a link to provide feedback', () => {
      expect(wrapper.find('[data-test-subj="FeedbackCallout"]')).toHaveLength(1);
    });
  });
});
