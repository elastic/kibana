/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { RedirectDependenciesToDependenciesInventory } from './redirect_dependencies_to_dependencies_inventory';

function LocationDisplay() {
  const location = useLocation();
  return <div data-test-subj="location">{location.pathname + location.search}</div>;
}

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <RedirectDependenciesToDependenciesInventory>
        <div>child content</div>
      </RedirectDependenciesToDependenciesInventory>
      <LocationDisplay />
    </MemoryRouter>
  );
}

describe('RedirectDependenciesToDependenciesInventory', () => {
  it.each([
    '/dependencies',
    '/dependencies/overview',
    '/dependencies/operations',
    '/dependencies/operation',
  ])('redirects %s to the dependencies inventory when dependencyName is missing', (pathname) => {
    renderAt(`${pathname}?comparisonEnabled=true&rangeFrom=now-15m&rangeTo=now`);

    expect(screen.getByTestId('location')).toHaveTextContent('/dependencies/inventory');
    // the existing query params are preserved through the redirect
    expect(screen.getByTestId('location')).toHaveTextContent('comparisonEnabled=true');
    expect(screen.getByTestId('location')).toHaveTextContent('rangeFrom=now-15m');
  });

  it('does not redirect a dependencies detail route when dependencyName is present', () => {
    renderAt('/dependencies/overview?dependencyName=postgres&comparisonEnabled=true');

    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/dependencies/overview');
  });

  it('does not redirect the dependencies inventory itself', () => {
    renderAt('/dependencies/inventory?comparisonEnabled=true');

    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/dependencies/inventory');
  });

  it('does not redirect unrelated routes without dependencyName', () => {
    renderAt('/services?comparisonEnabled=true');

    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/services');
  });
});
