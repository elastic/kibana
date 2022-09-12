/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SelectedStatusMessage } from './selected_status_message';

describe('SelectedStatusMessage', () => {
  it('does not render if the count is 0', () => {
    const { container } = render(<SelectedStatusMessage selectedCount={0} message={'hello'} />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('hello')).not.toBeInTheDocument();
  });

  it('renders the message when the count is great than 0', () => {
    render(<SelectedStatusMessage selectedCount={1} message={'hello'} />);

    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
