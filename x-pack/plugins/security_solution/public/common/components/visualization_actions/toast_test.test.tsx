/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToaseText } from './toast_text';

const mockUrl = 'http://mockurl/app/security/cases';

describe('ToaseText', () => {
  it('should render view case text', () => {
    render(<ToaseText href={mockUrl} />);
    expect(screen.getByText('View case')).toBeInTheDocument();
  });

  it('should render view case link', () => {
    const { container } = render(<ToaseText href={mockUrl} />);
    expect(
      container.querySelector('[data-test-subj="viz-action-view-case"]')?.getAttribute('href')
    ).toEqual(mockUrl);
  });
});
