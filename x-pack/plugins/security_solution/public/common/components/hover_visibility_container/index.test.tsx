/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../mock';

import { HoverVisibilityContainer } from '.';

describe('HoverVisibilityContainer', () => {
  const targetClass1 = 'Component1';
  const targetClass2 = 'Component2';
  const Component1 = () => <div className={targetClass1} />;
  const Component2 = () => <div className={targetClass2} />;

  test('it renders a transparent inspect button by default', () => {
    const wrapper = mount(
      <TestProviders>
        <HoverVisibilityContainer targetClassNames={[targetClass1, targetClass2]}>
          <Component1 />
          <Component2 />
        </HoverVisibilityContainer>
      </TestProviders>
    );
    expect(wrapper.find(`HoverVisibilityContainer`)).toHaveStyleRule('opacity', '0', {
      modifier: `.${targetClass1}`,
    });
    expect(wrapper.find(`HoverVisibilityContainer`)).toHaveStyleRule('opacity', '1', {
      modifier: `:hover .${targetClass2}`,
    });
  });

  test('it renders an opaque inspect button when it has mouse focus', () => {
    const wrapper = mount(
      <TestProviders>
        <HoverVisibilityContainer targetClassNames={[targetClass1, targetClass2]}>
          <Component1 />
          <Component2 />
        </HoverVisibilityContainer>
      </TestProviders>
    );
    expect(wrapper.find(`HoverVisibilityContainer`)).toHaveStyleRule('opacity', '1', {
      modifier: `:hover .${targetClass1}`,
    });
    expect(wrapper.find(`HoverVisibilityContainer`)).toHaveStyleRule('opacity', '1', {
      modifier: `:hover .${targetClass2}`,
    });
  });
});
