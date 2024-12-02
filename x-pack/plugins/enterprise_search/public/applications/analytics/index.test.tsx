/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../common/__mocks__';
import '../__mocks__/kea_logic';
import '../__mocks__/shallow_useeffect.mock';
import '../__mocks__/enterprise_search_url.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { AnalyticsOverview } from './components/analytics_overview/analytics_overview';

import { Analytics } from '.';

describe('EnterpriseSearchAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('always renders the overview', () => {
    const wrapper = shallow(<Analytics />);

    expect(wrapper.find(AnalyticsOverview)).toHaveLength(1);
  });
});
