/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallow } from 'enzyme';
import React from 'react';

import { AddToFilterListLink } from './add_to_filter_list_link';

describe('AddToFilterListLink', () => {

  test(`renders the add to filter list link for a value`, () => {
    const addItemToFilterList = jest.fn(() => {});

    const wrapper = shallow(
      <AddToFilterListLink
        fieldValue="elastic.co"
        filterId="safe_domains"
        addItemToFilterList={addItemToFilterList}
      />
    );

    expect(wrapper).toMatchSnapshot();

    wrapper.find('EuiLink').simulate('click');
    wrapper.update();
    expect(addItemToFilterList).toHaveBeenCalled();
  });

});
