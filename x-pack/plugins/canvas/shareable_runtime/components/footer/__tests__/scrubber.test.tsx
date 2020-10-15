/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { JestContext } from '../../../test/context_jest';
import { Scrubber } from '../scrubber';
import {
  getScrubberSlideContainer as container,
  getRenderedElement as element,
} from '../../../test/selectors';

jest.mock('../../../supported_renderers');

describe('<Scrubber />', () => {
  test('null workpad renders nothing', () => {
    expect(mount(<Scrubber />).isEmptyRender());
  });

  const wrapper = mount(
    <JestContext>
      <Scrubber />
    </JestContext>
  );

  test('renders as expected', () => {
    expect(container(wrapper).children().length === 1);
    expect(element(wrapper).text()).toEqual('markdown mock');
  });
});
