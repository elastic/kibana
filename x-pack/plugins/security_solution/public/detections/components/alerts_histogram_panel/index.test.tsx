/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

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
      },
    }),
    useUiSetting$: jest.fn().mockReturnValue([]),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});
jest.mock('../../../common/components/navigation/use_get_url_search');

describe('AlertsHistogramPanel', () => {
  const defaultProps = {
    from: 0,
    signalIndexName: 'signalIndexName',
    setQuery: jest.fn(),
    to: 1,
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
});
