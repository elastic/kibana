/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues } from '../../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { Route, Switch } from 'react-router-dom';

import { DisplaySettings } from './display_settings';

import { DisplaySettingsRouter } from './display_settings_router';

describe('DisplaySettingsRouter', () => {
  it('renders', () => {
    setMockValues({ isOrganization: true });
    const wrapper = shallow(<DisplaySettingsRouter />);

    expect(wrapper.find(DisplaySettings)).toHaveLength(2);
    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(2);
  });
});
