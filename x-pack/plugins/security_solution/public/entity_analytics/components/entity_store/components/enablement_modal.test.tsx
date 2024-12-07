/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EntityStoreEnablementModal } from './enablement_modal';
import { TestProviders } from '../../../../common/mock';

const mockToggle = jest.fn();
const mockEnableStore = jest.fn(() => jest.fn());

const defaultProps = {
  visible: true,
  toggle: mockToggle,
  enableStore: mockEnableStore,
  riskScore: { disabled: false, checked: false },
  entityStore: { disabled: false, checked: false },
};

const renderComponent = (props = defaultProps) => {
  return render(<EntityStoreEnablementModal {...props} />, { wrapper: TestProviders });
};

describe('EntityStoreEnablementModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal when visible is true', () => {
    renderComponent();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not render the modal when visible is false', () => {
    renderComponent({ ...defaultProps, visible: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call toggle function when cancel button is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockToggle).toHaveBeenCalledWith(false);
  });

  it('should call enableStore function when enable button is clicked', () => {
    renderComponent({
      ...defaultProps,
      riskScore: { ...defaultProps.riskScore, checked: true },
      entityStore: { ...defaultProps.entityStore, checked: true },
    });
    fireEvent.click(screen.getByText('Enable'));
    expect(mockEnableStore).toHaveBeenCalledWith({ riskScore: true, entityStore: true });
  });

  it('should display proceed warning when no enablement options are selected', () => {
    renderComponent();
    expect(screen.getByText('Please enable at least one option to proceed.')).toBeInTheDocument();
  });

  it('should disable the enable button when enablementOptions are false', () => {
    renderComponent({
      ...defaultProps,
      riskScore: { ...defaultProps.riskScore, checked: false },
      entityStore: { ...defaultProps.entityStore, checked: false },
    });

    const enableButton = screen.getByRole('button', { name: /Enable/i });
    expect(enableButton).toBeDisabled();
  });
});
