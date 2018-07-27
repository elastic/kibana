/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { SpacesTable } from './spaces_table';
import {
  EuiLink
} from '@elastic/eui';

describe('SpacesTable', () => {
  it('renders without crashing', () => {
    const wrapper = mount(<SpacesTable spaces={[]} onSelectSpace={jest.fn()} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders a link for each space', () => {
    const spaces = [{
      id: 'space-1',
      name: 'Space 1'
    }, {
      id: 'space-2',
      name: 'Space 2'
    }];

    const wrapper = mount(<SpacesTable spaces={spaces} onSelectSpace={jest.fn()} />);
    expect(wrapper.find(EuiLink)).toHaveLength(2);
  });

  it('fires a callback when link is clicked', () => {
    const spaces = [{
      id: 'space-1',
      name: 'Space 1'
    }, {
      id: 'space-2',
      name: 'Space 2'
    }];

    const callback = jest.fn();

    const wrapper = mount(<SpacesTable spaces={spaces} onSelectSpace={callback} />);
    wrapper.find(EuiLink).at(0).simulate('click');

    expect(callback).toHaveBeenCalledWith(spaces[0]);
  });
});
