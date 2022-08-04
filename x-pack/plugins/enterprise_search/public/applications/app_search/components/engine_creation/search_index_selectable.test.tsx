/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { IndexStatusDetails, SearchIndexSelectableOption } from './search_index_selectable';

const mockOption: SearchIndexSelectableOption = {
  count: 123,
  label: 'string',
  alias: true,
  badge: {
    color: 'string',
    label: 'string',
    toolTipTitle: 'string',
    toolTipContent: 'string',
  },
  disabled: true,
  total: {
    docs: {
      count: 123,
      deleted: 123,
    },
    store: {
      size_in_bytes: 'string',
    },
  },
};

describe('IndexStatusDetails', () => {
  it('does not render anything if an option is not provided', () => {
    const wrapper = shallow(<IndexStatusDetails />);
    expect(wrapper.find('.entSearch__indexListItem')).toHaveLength(0);
  });

  it('renders if there is an option provided', () => {
    const wrapper = shallow(<IndexStatusDetails option={mockOption} />);
    expect(wrapper.find('.entSearch__indexListItem')).toHaveLength(1);
  });
});
