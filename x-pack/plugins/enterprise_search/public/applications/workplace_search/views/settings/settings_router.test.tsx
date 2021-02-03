/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockActions } from '../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { Route, Redirect, Switch } from 'react-router-dom';

import { staticSourceData } from '../content_sources/source_data';

import { FlashMessages } from '../../../shared/flash_messages';

import { Connectors } from './components/connectors';
import { Customize } from './components/customize';
import { OauthApplication } from './components/oauth_application';
import { SourceConfig } from './components/source_config';

import { SettingsRouter } from './settings_router';

describe('SettingsRouter', () => {
  const initializeSettings = jest.fn();
  const NUM_SOURCES = staticSourceData.length;
  // Should be 3 routes other than the sources listed Connectors, Customize, & OauthApplication
  const NUM_ROUTES = NUM_SOURCES + 3;

  beforeEach(() => {
    setMockActions({ initializeSettings });
  });

  it('renders', () => {
    const wrapper = shallow(<SettingsRouter />);

    expect(wrapper.find(FlashMessages)).toHaveLength(1);
    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(NUM_ROUTES);
    expect(wrapper.find(Redirect)).toHaveLength(1);
    expect(wrapper.find(Connectors)).toHaveLength(1);
    expect(wrapper.find(Customize)).toHaveLength(1);
    expect(wrapper.find(OauthApplication)).toHaveLength(1);
    expect(wrapper.find(SourceConfig)).toHaveLength(NUM_SOURCES);
  });
});
