/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { OverviewEmpty } from '.';
import { useUserPrivileges } from '../../../common/components/user_privileges';

const endpointPackageVersion = '0.19.1';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../management/pages/endpoint_hosts/view/hooks', () => ({
  useIngestUrl: jest
    .fn()
    .mockReturnValue({ appId: 'ingestAppId', appPath: 'ingestPath', url: 'ingestUrl' }),
  useEndpointSelector: jest.fn().mockReturnValue({ endpointPackageVersion }),
}));

jest.mock('../../../common/components/user_privileges', () => ({
  useUserPrivileges: jest
    .fn()
    .mockReturnValue({ endpointPrivileges: { loading: false, canAccessFleet: true } }),
}));

jest.mock('../../../common/hooks/endpoint/use_navigate_to_app_event_handler', () => ({
  useNavigateToAppEventHandler: jest.fn(),
}));

describe('OverviewEmpty', () => {
  describe('When isIngestEnabled = true', () => {
    let wrapper: ShallowWrapper;
    beforeAll(() => {
      wrapper = shallow(<OverviewEmpty />);
    });

    afterAll(() => {
      (useUserPrivileges as jest.Mock).mockReset();
    });

    /** TODO: Need help fixing tests because of nested props */
    it.skip('render with correct actions ', () => {
      expect(wrapper.find('[data-test-subj="empty-page"]').prop('actions')).toEqual({
        elasticAgent: {
          url: 'ingestUrl',
        },
      });
    });
  });

  describe('When isIngestEnabled = false', () => {
    let wrapper: ShallowWrapper;
    beforeAll(() => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        endpointPrivileges: { loading: false, canAccessFleet: false },
      });
      wrapper = shallow(<OverviewEmpty />);
    });

    /** TODO: Need help fixing tests because of nested props */
    it.skip('render with correct actions ', () => {
      expect(wrapper.find('[data-test-subj="empty-page"]').prop('actions')).toEqual({
        beats: {
          url: '/app/home#/tutorial_directory/security',
        },
      });
    });
  });
});
