/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { SpacesContextMenu } from './spaces_context_menu';
import { EuiContextMenuItem } from '@elastic/eui';

const spaces = [{
  id: 'a-space',
  name: 'a space',
  urlContext: 'a-space',
}, {
  id: 'b-space',
  name: 'b space',
  urlContext: 'b-space',
}, {
  id: 'default',
  name: 'Default Space',
  urlContext: '',
  _reserved: true
}];

test('it renders without blowing up', () => {
  shallow(<SpacesContextMenu spaces={[]} onSelectSpace={jest.fn()} />);
});

test('it renders the provided spaces', () => {
  const wrapper = mount(<SpacesContextMenu spaces={spaces} onSelectSpace={jest.fn()} />);
  expect(wrapper.find(EuiContextMenuItem)).toHaveLength(spaces.length);

  expect(wrapper).toMatchSnapshot();
});

test('it calls the click handler when a space is clicked', () => {
  const clickHandler = jest.fn();
  const wrapper = mount(<SpacesContextMenu spaces={spaces} onSelectSpace={clickHandler} />);

  expect(clickHandler).toHaveBeenCalledTimes(0);

  wrapper.find('button[data-id="default"]').simulate('click');

  expect(clickHandler).toHaveBeenCalledTimes(1);
  const [calledWithSpace] = clickHandler.mock.calls[0];
  expect(calledWithSpace).toEqual(spaces[2]);
});
