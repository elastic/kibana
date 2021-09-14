/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

  test('should not scroll when `shouldScroll` is false', () => {
    Object.defineProperty(globalNode.window, 'scroll', { value: spyScroll });
    mount(<HookWrapper hook={() => useScrollToTop(undefined, false)} />);

    expect(spyScrollTo).not.toHaveBeenCalled();
  });

  test('should scroll the element matching the given selector', () => {
    const fakeElement = { scroll: spyScroll };
    Object.defineProperty(globalNode.document, 'querySelector', {
      value: () => fakeElement,
    });
    mount(<HookWrapper hook={() => useScrollToTop('fake selector')} />);

    expect(spyScroll).toHaveBeenCalledWith(0, 0);
  });
});
