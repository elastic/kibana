/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { JestContext } from '../../../test/context_jest';
import {
  getPageControlsPrevious as previous,
  getPageControlsCenter as current,
  getPageControlsNext as next,
} from '../../../test/selectors';
import { PageControls } from '../page_controls';

jest.mock('../../../supported_renderers');

describe('<PageControls />', () => {
  test('null workpad renders nothing', () => {
    expect(mount(<PageControls />).isEmptyRender());
  });

  const hello = mount(
    <JestContext source="hello">
      <PageControls />
    </JestContext>
  );
  const austin = mount(
    <JestContext source="austin">
      <PageControls />
    </JestContext>
  );

  test('hello: renders as expected', () => {
    expect(previous(hello).props().disabled).toEqual(true);
    expect(next(hello).props().disabled).toEqual(true);
    expect(current(hello).text()).toEqual('Page 1');
  });

  test('austin: renders as expected', () => {
    expect(previous(austin).props().disabled).toEqual(true);
    expect(next(austin).props().disabled).toEqual(false);
    expect(current(austin).text()).toEqual('Page 1 of 28');
  });

  test('austin: moves between pages', () => {
    next(austin).simulate('click');
    expect(current(austin).text()).toEqual('Page 2 of 28');
    next(austin).simulate('click');
    expect(current(austin).text()).toEqual('Page 3 of 28');
    previous(austin).simulate('click');
    expect(current(austin).text()).toEqual('Page 2 of 28');
  });
});
