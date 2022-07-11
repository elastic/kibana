/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';

import React from 'react';
import { Switch } from 'react-router-dom';

import { shallow } from 'enzyme';

import { NewIndex } from '../new_index';
import { SearchIndexRouter } from '../search_index/search_index_router';

import { SearchIndices } from './search_indices';

import { SearchIndicesRouter } from '.';

describe('SearchIndicesRouter', () => {
  it('renders Search index routes', () => {
    const wrapper = shallow(<SearchIndicesRouter />);

    const routeSwitch = wrapper.find(Switch);

    expect(routeSwitch.find(NewIndex)).toHaveLength(1);
    expect(routeSwitch.find(SearchIndices)).toHaveLength(1);
    expect(routeSwitch.find(SearchIndexRouter)).toHaveLength(1);
  });
});
