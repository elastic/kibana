/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallow } from 'enzyme';
import React from 'react';

import { FilterListsHeader } from './header';

describe('Filter Lists Header', () => {

  const refreshFilterLists = jest.fn(() => {});

  const requiredProps = {
    totalCount: 3,
    refreshFilterLists,
  };

  test('renders header', () => {
    const props = {
      ...requiredProps,
    };

    const component = shallow(
      <FilterListsHeader {...props} />
    );

    expect(component).toMatchSnapshot();

  });

});
