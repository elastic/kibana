/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { HoverVisibilityContainer } from '.';

describe('HoverVisibilityContainer', () => {
  const targetClass1 = 'Component1';
  const targetClass2 = 'Component2';
  const Component1 = () => <div className={targetClass1} data-test-subj="component1" />;
  const Component2 = () => <div className={targetClass2} data-test-subj="component2" />;

  test('it renders a transparent inspect button by default', async () => {
    render(
      <HoverVisibilityContainer targetClassNames={[targetClass1, targetClass2]}>
        <Component1 />
        <Component2 />
      </HoverVisibilityContainer>
    );

    expect(await screen.findByTestId('hoverVisibilityContainer')).toHaveStyleRule('opacity', '0', {
      modifier: `.${targetClass1}`,
    });

    expect(await screen.getByTestId(`hoverVisibilityContainer`)).toHaveStyleRule('opacity', '1', {
      modifier: `:hover .${targetClass2}`,
    });
  });

  test('it renders an opaque inspect button when it has mouse focus', async () => {
    render(
      <HoverVisibilityContainer targetClassNames={[targetClass1, targetClass2]}>
        <Component1 />
        <Component2 />
      </HoverVisibilityContainer>
    );
    expect(await screen.findByTestId('hoverVisibilityContainer')).toHaveStyleRule('opacity', '1', {
      modifier: `:hover .${targetClass1}`,
    });
    expect(await screen.findByTestId('hoverVisibilityContainer')).toHaveStyleRule('opacity', '1', {
      modifier: `:hover .${targetClass2}`,
    });
  });
});
