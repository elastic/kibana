/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TechnicalPreviewBadge } from './technical_preview_badge';

describe('TechnicalPreviewBadge', () => {
  it('uses the short label as the accessible name so it does not repeat the tooltip description', () => {
    render(<TechnicalPreviewBadge icon="flask" />);

    const badge = screen.getByRole('button', { name: 'Technical preview' });

    expect(badge).not.toHaveAccessibleName(/technical preview and may be changed/);
  });
});
