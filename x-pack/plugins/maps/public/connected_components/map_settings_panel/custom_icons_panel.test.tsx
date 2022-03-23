/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
  };
});

import React from 'react';
import { shallow } from 'enzyme';
import { getDefaultMapSettings } from '../../reducers/map/default_map_settings';

import { CustomIconsPanel } from './custom_icons_panel';

const defaultProps = {
  settings: getDefaultMapSettings(),
  updateMapSetting: () => {},
};

test('should render', async () => {
  const component = shallow(<CustomIconsPanel {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

test('should render with custom icons', async () => {
  const settings = {
    ...defaultProps.settings,
    customIcons: [
      {
        symbolId: '__kbn__custom_icon_sdf__foobar',
        label: 'My Custom Icon',
        svg: '<svg width="200" height="250" xmlns="http://www.w3.org/2000/svg"><path stroke="#000" fill="transparent" stroke-width="5" d="M10 10h30v30H10z"/></svg>',
        cutoff: 0.25,
        radius: 0.25,
      },
      {
        symbolId: '__kbn__custom_icon_sdf__bizzbuzz',
        label: 'My Other Custom Icon',
        svg: '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="531.74" height="460.5" overflow="visible" xml:space="preserve"><path stroke="#000" d="M.866 460 265.87 1l265.004 459z"/></svg>',
        cutoff: 0.3,
        radius: 0.15,
      },
    ],
  };
  const component = shallow(<CustomIconsPanel {...defaultProps} settings={settings} />);

  expect(component).toMatchSnapshot();
});
