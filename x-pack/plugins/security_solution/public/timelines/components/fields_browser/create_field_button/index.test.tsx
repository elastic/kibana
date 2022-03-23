/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useCreateFieldButton, UseCreateFieldButton, UseCreateFieldButtonProps } from './index';

import { TestProviders } from '../../../../common/mock';
import { renderHook } from '@testing-library/react-hooks';

const mockOpenFieldEditor = jest.fn();
const mockOnHide = jest.fn();

const renderUseCreateFieldButton = (props: Partial<UseCreateFieldButtonProps> = {}) =>
  renderHook<UseCreateFieldButtonProps, ReturnType<UseCreateFieldButton>>(
    () =>
      useCreateFieldButton({
        hasFieldEditPermission: true,
        loading: false,
        openFieldEditor: mockOpenFieldEditor,
        ...props,
      }),
    {
      wrapper: TestProviders,
    }
  );

describe('useCreateFieldButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the button component function when user has edit permissions', async () => {
    const { result } = renderUseCreateFieldButton();
    expect(result.current).not.toBeUndefined();
  });

  it('should return the undefined when user do not has edit permissions', async () => {
    const { result } = renderUseCreateFieldButton({ hasFieldEditPermission: false });
    expect(result.current).toBeUndefined();
  });

  it('should return a button wrapped component', async () => {
    const { result } = renderUseCreateFieldButton();

    const CreateFieldButton = result.current!;
    const { getByRole } = render(<CreateFieldButton onHide={mockOnHide} />, {
      wrapper: TestProviders,
    });

    expect(getByRole('button')).toBeInTheDocument();
  });

  it('should call openFieldEditor and hide the modal when button clicked', async () => {
    const { result } = renderUseCreateFieldButton();

    const CreateFieldButton = result.current!;
    const { getByRole } = render(<CreateFieldButton onHide={mockOnHide} />, {
      wrapper: TestProviders,
    });

    getByRole('button').click();
    expect(mockOpenFieldEditor).toHaveBeenCalled();
    expect(mockOnHide).toHaveBeenCalled();
  });
});
