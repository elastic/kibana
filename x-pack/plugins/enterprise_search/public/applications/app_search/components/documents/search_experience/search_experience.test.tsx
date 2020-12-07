/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import '../../../../__mocks__/kea.mock';
import { setMockValues } from '../../../../__mocks__';
import '../../../../__mocks__/enterprise_search_url.mock';

import React from 'react';
// @ts-expect-error types are not available for this package yet
import { SearchProvider } from '@elastic/react-search-ui';
import { shallow } from 'enzyme';

import { SearchExperience } from './search_experience';

describe('SearchExperience', () => {
  const values = {
    engine: {
      name: 'some-engine',
      apiKey: '1234',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
  });

  it('renders', () => {
    const wrapper = shallow(<SearchExperience />);
    expect(wrapper.find(SearchProvider).length).toBe(1);
  });
});
