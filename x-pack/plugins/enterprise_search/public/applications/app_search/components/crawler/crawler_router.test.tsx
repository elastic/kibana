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
import { CrawlerRouter } from './crawler_router';

describe('CrawlerRouter', () => {
  beforeEach(() => {
    setMockValues({ ...mockEngineValues });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a landing page', () => {
    const wrapper = shallow(<CrawlerRouter />);

    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(CrawlerLanding)).toHaveLength(1);
  });
});
