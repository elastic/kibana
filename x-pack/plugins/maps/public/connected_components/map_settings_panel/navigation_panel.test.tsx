/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { NavigationPanel } from './navigation_panel';
import { getDefaultMapSettings } from '../../reducers/default_map_settings';
import { INITIAL_LOCATION } from '../../../common/constants';

jest.mock('../../kibana_services', () => ({
  getIsDarkMode() {
    return false;
  },
}));

const defaultProps = {
  center: { lat: 0, lon: 0 },
  settings: getDefaultMapSettings(),
  updateMapSetting: () => {},
  zoom: 0,
};

test('should render', async () => {
  const component = shallow(<NavigationPanel {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

test('should render fixed location form when initialLocation is FIXED_LOCATION', async () => {
  const settings = {
    ...defaultProps.settings,
    initialLocation: INITIAL_LOCATION.FIXED_LOCATION,
  };
  const component = shallow(<NavigationPanel {...defaultProps} settings={settings} />);

  expect(component).toMatchSnapshot();
});

test('should render browser location form when initialLocation is BROWSER_LOCATION', async () => {
  const settings = {
    ...defaultProps.settings,
    initialLocation: INITIAL_LOCATION.BROWSER_LOCATION,
  };
  const component = shallow(<NavigationPanel {...defaultProps} settings={settings} />);

  expect(component).toMatchSnapshot();
});
