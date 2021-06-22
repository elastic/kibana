/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { OverviewEmpty } from '.';
import { useIngestEnabledCheck } from '../../../common/hooks/endpoint/ingest_enabled';

const endpointPackageVersion = '0.19.1';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../management/pages/endpoint_hosts/view/hooks', () => ({
  useIngestUrl: jest
    .fn()
    .mockReturnValue({ appId: 'ingestAppId', appPath: 'ingestPath', url: 'ingestUrl' }),
  useEndpointSelector: jest.fn().mockReturnValue({ endpointPackageVersion }),
}));

jest.mock('../../../common/hooks/endpoint/ingest_enabled', () => ({
  useIngestEnabledCheck: jest.fn().mockReturnValue({ allEnabled: true }),
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
      (useIngestEnabledCheck as jest.Mock).mockReset();
    });

    test('render with correct actions ', () => {
      expect(wrapper.find('[data-test-subj="empty-page"]').prop('actions')).toEqual({
        beats: {
          description:
            'Lightweight Beats can send data from hundreds or thousands of machines and systems',
          fill: false,
          label: 'Add data with Beats',
          url: '/app/home#/tutorial_directory/security',
        },
        elasticAgent: {
          description:
            'The Elastic Agent provides a simple, unified way to add monitoring to your hosts.',
          fill: false,
          label: 'Add data with Elastic Agent',
          url: 'ingestUrl',
        },
        endpoint: {
          description:
            'Protect your hosts with threat prevention, detection, and deep security data visibility.',
          fill: false,
          label: 'Add Endpoint Security',
          onClick: undefined,
          url: `#/integrations/endpoint-${endpointPackageVersion}/add-integration`,
        },
      });
    });
  });

  describe('When isIngestEnabled = false', () => {
    let wrapper: ShallowWrapper;
    beforeAll(() => {
      (useIngestEnabledCheck as jest.Mock).mockReturnValue({ allEnabled: false });
      wrapper = shallow(<OverviewEmpty />);
    });

    test('render with correct actions ', () => {
      expect(wrapper.find('[data-test-subj="empty-page"]').prop('actions')).toEqual({
        beats: {
          description:
            'Lightweight Beats can send data from hundreds or thousands of machines and systems',
          fill: false,
          label: 'Add data with Beats',
          url: '/app/home#/tutorial_directory/security',
        },
      });
    });
  });
});
