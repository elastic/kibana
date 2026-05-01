/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DevModePlaceholder } from './dev_mode_placeholder';

describe('DevModePlaceholder', () => {
  it('renders children with placeholder outline in dev mode by default', () => {
    const { container } = render(
      <DevModePlaceholder>
        <p>Content</p>
      </DevModePlaceholder>
    );
    // In test environment NODE_ENV is 'test' which is not 'production', so IS_DEV_MODE is true
    expect(container.querySelector('div')).toBeInTheDocument();
    expect(container.textContent).toBe('Content');
  });

  it('renders children without outline when hasPlaceholderData is false', () => {
    const { container } = render(
      <DevModePlaceholder hasPlaceholderData={false}>
        <p>No placeholder</p>
      </DevModePlaceholder>
    );
    // Should not wrap in a div
    expect(container.querySelector('div')).not.toBeInTheDocument();
    expect(container.textContent).toBe('No placeholder');
  });
});
