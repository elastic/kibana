/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../__mocks__/shallow_useeffect.mock';
import '../__mocks__/enterprise_search_url.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EnterpriseSearchRelevance, EnterpriseSearchRelevanceConfigured } from '.';

describe('EnterpriseSearchRelevance', () => {
  it('renders EnterpriseSearchRelevanceConfigured', () => {
    const wrapper = shallow(<EnterpriseSearchRelevance />);

    expect(wrapper.find(EnterpriseSearchRelevanceConfigured)).toHaveLength(1);
  });
});
