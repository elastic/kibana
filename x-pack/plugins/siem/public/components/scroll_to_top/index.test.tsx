/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { globalNode, HookWrapper } from '../../mock';
import { useScrollToTop } from '.';

const spyScroll = jest.fn();
const spyScrollTo = jest.fn();

describe('Scroll to top', () => {
  beforeEach(() => {
    spyScroll.mockClear();
    spyScrollTo.mockClear();
  });

  test('scroll have been called', () => {
    Object.defineProperty(globalNode.window, 'scroll', { value: spyScroll });
    mount(<HookWrapper hook={() => useScrollToTop()} />);

    expect(spyScroll).toHaveBeenCalledWith(0, 0);
  });

  test('scrollTo have been called', () => {
    Object.defineProperty(globalNode.window, 'scroll', { value: null });
    Object.defineProperty(globalNode.window, 'scrollTo', { value: spyScrollTo });
    mount(<HookWrapper hook={() => useScrollToTop()} />);
    expect(spyScrollTo).toHaveBeenCalled();
  });
});
