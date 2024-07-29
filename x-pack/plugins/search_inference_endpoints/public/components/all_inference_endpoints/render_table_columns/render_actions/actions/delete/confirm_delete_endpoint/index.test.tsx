/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { ConfirmDeleteEndpointModal } from '.';
import * as i18n from './translations';

describe('ConfirmDeleteEndpointModal', () => {
  const mockOnCancel = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    render(<ConfirmDeleteEndpointModal onCancel={mockOnCancel} onConfirm={mockOnConfirm} />);
  });

  it('renders the modal with correct texts', () => {
    expect(screen.getByText(i18n.DELETE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.CONFIRM_DELETE_WARNING)).toBeInTheDocument();
    expect(screen.getByText(i18n.CANCEL)).toBeInTheDocument();
    expect(screen.getByText(i18n.DELETE_ACTION_LABEL)).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    fireEvent.click(screen.getByText(i18n.CANCEL));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onConfirm when the delete button is clicked', () => {
    fireEvent.click(screen.getByText(i18n.DELETE_ACTION_LABEL));
    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('has the delete button focused by default', () => {
    expect(document.activeElement).toHaveTextContent(i18n.DELETE_ACTION_LABEL);
  });
});
