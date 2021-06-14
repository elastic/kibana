/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';
import { mockEngineValues } from '../../__mocks__';

import React from 'react';
import { Switch } from 'react-router-dom';

import { shallow } from 'enzyme';

import { CrawlerLanding } from './crawler_landing';
import { CrawlerOverview } from './crawler_overview';
import { CrawlerRouter } from './crawler_router';

describe('CrawlerRouter', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ ...mockEngineValues });
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('renders a landing page by default', () => {
    const wrapper = shallow(<CrawlerRouter />);

    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(CrawlerLanding)).toHaveLength(1);
  });

  it('renders a crawler overview in dev', () => {
    process.env.NODE_ENV = 'development';
    const wrapper = shallow(<CrawlerRouter />);

    expect(wrapper.find(CrawlerOverview)).toHaveLength(1);
  });
});
