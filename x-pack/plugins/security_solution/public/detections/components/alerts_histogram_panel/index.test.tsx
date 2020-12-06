/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { shallow, mount } from 'enzyme';

import '../../../common/mock/match_media';
import { esQuery } from '../../../../../../../src/plugins/data/public';
import { TestProviders } from '../../../common/mock';
import { AlertsHistogramPanel } from './index';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    createHref: jest.fn(),
    useHistory: jest.fn(),
  };
});

const mockNavigateToApp = jest.fn();
jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
          getUrlForApp: jest.fn(),
        },
        uiSettings: {
          get: jest.fn(),
        },
      },
    }),
    useUiSetting$: jest.fn().mockReturnValue([]),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

jest.mock('../../../common/components/navigation/use_get_url_search');

describe('AlertsHistogramPanel', () => {
  const defaultProps = {
    from: '2020-07-07T08:20:18.966Z',
    signalIndexName: 'signalIndexName',
    setQuery: jest.fn(),
    to: '2020-07-08T08:20:18.966Z',
    updateDateRange: jest.fn(),
  };

  it('renders correctly', () => {
    const wrapper = shallow(<AlertsHistogramPanel {...defaultProps} />);

    expect(wrapper.find('[id="detections-histogram"]')).toBeTruthy();
  });

  describe('Button view alerts', () => {
    it('renders correctly', () => {
      const props = { ...defaultProps, showLinkToAlerts: true };
      const wrapper = shallow(<AlertsHistogramPanel {...props} />);

      expect(
        wrapper.find('[data-test-subj="alerts-histogram-panel-go-to-alerts-page"]')
      ).toBeTruthy();
    });

    it('when click we call navigateToApp to make sure to navigate to right page', () => {
      const props = { ...defaultProps, showLinkToAlerts: true };
      const wrapper = shallow(<AlertsHistogramPanel {...props} />);

      wrapper
        .find('[data-test-subj="alerts-histogram-panel-go-to-alerts-page"]')
        .simulate('click', {
          preventDefault: jest.fn(),
        });

      expect(mockNavigateToApp).toBeCalledWith('securitySolution:detections', { path: '' });
    });
  });

  describe('Query', () => {
    it('it render with a illegal KQL', async () => {
      const spyOnBuildEsQuery = jest.spyOn(esQuery, 'buildEsQuery');
      spyOnBuildEsQuery.mockImplementation(() => {
        throw new Error('Something went wrong');
      });
      const props = { ...defaultProps, query: { query: 'host.name: "', language: 'kql' } };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(wrapper.find('[id="detections-histogram"]')).toBeTruthy();
      });
    });
  });
});
