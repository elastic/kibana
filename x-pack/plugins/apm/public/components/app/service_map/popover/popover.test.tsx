/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/testing-react';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import * as stories from './popover.stories';

const { Backend, ExternalsList, Resource, Service } = composeStories(stories);

describe('Popover', () => {
  describe('with backend data', () => {
    it('renders a dependency link', async () => {
      render(<Backend />);

      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: /Dependency Details/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe('with externals list data', () => {
    it('renders an externals list', async () => {
      render(<ExternalsList />);

      await waitFor(() => {
        expect(
          screen.getByText(/813-mam-392.mktoresp.com:443/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('with resource data', () => {
    it('renders with no buttons', async () => {
      render(<Resource />);

      await waitFor(() => {
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
      });
    });
  });

  describe('with service data', () => {
    it('renders contents for a service', async () => {
      render(<Service />);

      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: /service details/i })
        ).toBeInTheDocument();
      });
    });
  });
});
