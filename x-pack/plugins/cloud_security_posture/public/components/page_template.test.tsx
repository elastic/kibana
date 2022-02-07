/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import Chance from 'chance';
import { createNavigationItemFixture } from '../test/fixtures/navigation_item';
import { TestProvider } from '../test/test_provider';
import { CspPageTemplate, getSideNavItems } from './page_template';

const chance = new Chance();

describe('getSideNavItems', () => {
  it('maps navigation items to side navigation items', () => {
    const navigationItem = createNavigationItemFixture();
    const id = chance.word();
    const sideNavItems = getSideNavItems({ [id]: navigationItem });

    expect(sideNavItems).toHaveLength(1);
    expect(sideNavItems[0]).toMatchObject({
      id,
      name: navigationItem.name,
      renderItem: expect.any(Function),
    });
  });

  it('does not map disabled navigation items to side navigation items', () => {
    const navigationItem = createNavigationItemFixture({ disabled: true });
    const id = chance.word();
    const sideNavItems = getSideNavItems({ [id]: navigationItem });
    expect(sideNavItems).toHaveLength(0);
  });
});

describe('<CspPageTemplate />', () => {
  const renderCspPageTemplate = (props: ComponentProps<typeof CspPageTemplate>) => {
    render(
      <TestProvider>
        <CspPageTemplate {...props} />
      </TestProvider>
    );
  };

  it('renders children when not loading', () => {
    const children = chance.sentence();
    renderCspPageTemplate({ isLoading: false, children });

    expect(screen.getByText(children)).toBeInTheDocument();
  });

  it('does not render loading text when not loading', () => {
    const children = chance.sentence();
    const loadingText = chance.sentence();
    renderCspPageTemplate({ isLoading: false, loadingText, children });

    expect(screen.queryByText(loadingText)).not.toBeInTheDocument();
  });

  it('renders loading text when loading is true', () => {
    const loadingText = chance.sentence();
    renderCspPageTemplate({ loadingText, isLoading: true });

    expect(screen.getByText(loadingText)).toBeInTheDocument();
  });

  it('does not render children when loading', () => {
    const children = chance.sentence();
    renderCspPageTemplate({ isLoading: true, children });

    expect(screen.queryByText(children)).not.toBeInTheDocument();
  });
});
