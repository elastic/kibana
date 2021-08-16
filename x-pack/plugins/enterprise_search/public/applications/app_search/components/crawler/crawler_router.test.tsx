/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';

import { shallow, ShallowWrapper } from 'enzyme';

import { rerender } from '../../../test_helpers';

import { CrawlerLanding } from './crawler_landing';
import { CrawlerOverview } from './crawler_overview';
import { CrawlerRouter } from './crawler_router';
import { CrawlerSingleDomain } from './crawler_single_domain';

describe('CrawlerRouter', () => {
  let wrapper: ShallowWrapper;
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    wrapper = shallow(<CrawlerRouter />);
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('renders a landing page by default', () => {
    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(CrawlerLanding)).toHaveLength(1);
  });

  it('renders a crawler overview in dev', () => {
    process.env.NODE_ENV = 'development';
    rerender(wrapper);

    expect(wrapper.find(CrawlerOverview)).toHaveLength(1);
  });

  it('renders a crawler single domain view', () => {
    expect(wrapper.find(CrawlerSingleDomain)).toHaveLength(1);
  });
});
