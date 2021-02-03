/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { AnalyticsTable } from '../components';
import { TopQueriesNoResults } from './';

describe('TopQueriesNoResults', () => {
  it('renders', () => {
    setMockValues({ topQueriesNoResults: [] });
    const wrapper = shallow(<TopQueriesNoResults />);

    expect(wrapper.find(AnalyticsTable)).toHaveLength(1);
  });
});
