/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useFieldTableColumns, UseFieldTableColumnsProps, UseFieldTableColumns } from '.';

import { TestProviders } from '../../../../common/mock';
import { renderHook } from '@testing-library/react-hooks';
import { BrowserFieldItem } from '@kbn/timelines-plugin/common/types';
import { EuiInMemoryTable } from '@elastic/eui';

const mockOnHide = jest.fn();
const mockOpenFieldEditor = jest.fn();
const mockOpenDeleteFieldModal = jest.fn();

// helper function to render the hook
const renderUseFieldTableColumns = (props: Partial<UseFieldTableColumnsProps> = {}) =>
  renderHook<UseFieldTableColumnsProps, ReturnType<UseFieldTableColumns>>(
    () =>
      useFieldTableColumns({
        hasFieldEditPermission: true,
        openFieldEditor: mockOpenFieldEditor,
        openDeleteFieldModal: mockOpenDeleteFieldModal,
        ...props,
      }),
    {
      wrapper: TestProviders,
    }
  );

const fieldItem: BrowserFieldItem = {
  name: 'field1',
  isRuntime: true,
  category: 'test',
  selected: false,
};

describe('useFieldTableColumns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all columns when user has edit permissions', async () => {
    const { result } = renderUseFieldTableColumns({ hasFieldEditPermission: true });

    const columns = result.current({
      highlight: '',
      onHide: mockOnHide,
    });

    const { getAllByRole, getByTestId } = render(
      <EuiInMemoryTable items={[fieldItem]} columns={columns} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(getAllByRole('columnheader').length).toBe(5);
    expect(getByTestId('actionEditRuntimeField')).toBeInTheDocument();
    expect(getByTestId('actionDeleteRuntimeField')).toBeInTheDocument();
  });

  it('should render default columns when user do not has edit permissions', async () => {
    const { result } = renderUseFieldTableColumns({ hasFieldEditPermission: false });

    const columns = result.current({
      highlight: '',
      onHide: mockOnHide,
    });

    const { getAllByRole, queryByTestId } = render(
      <EuiInMemoryTable items={[fieldItem]} columns={columns} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(getAllByRole('columnheader').length).toBe(4);
    expect(queryByTestId('actionEditRuntimeField')).toBeNull();
    expect(queryByTestId('actionDeleteRuntimeField')).toBeNull();
  });

  it('should not render the runtime action buttons when the field is not a runtime field', async () => {
    const { result } = renderUseFieldTableColumns();

    const columns = result.current({
      highlight: '',
      onHide: mockOnHide,
    });

    const { getAllByRole, queryByTestId } = render(
      <EuiInMemoryTable items={[{ ...fieldItem, isRuntime: false }]} columns={columns} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(getAllByRole('columnheader').length).toBe(5);
    expect(queryByTestId('actionEditRuntimeField')).toBeNull();
    expect(queryByTestId('actionDeleteRuntimeField')).toBeNull();
  });

  it('should call onHide if any action button is pressed', async () => {
    const { result } = renderUseFieldTableColumns();

    const columns = result.current({
      highlight: '',
      onHide: mockOnHide,
    });

    const { getByTestId } = render(<EuiInMemoryTable items={[fieldItem]} columns={columns} />, {
      wrapper: TestProviders,
    });

    getByTestId('actionEditRuntimeField').click();
    expect(mockOnHide).toHaveBeenCalledTimes(1);
    getByTestId('actionDeleteRuntimeField').click();
    expect(mockOnHide).toHaveBeenCalledTimes(2);
  });

  it('should call openFieldEditor if edit action button is pressed', async () => {
    const { result } = renderUseFieldTableColumns();

    const columns = result.current({
      highlight: '',
      onHide: mockOnHide,
    });

    const { getByTestId } = render(<EuiInMemoryTable items={[fieldItem]} columns={columns} />, {
      wrapper: TestProviders,
    });

    getByTestId('actionEditRuntimeField').click();
    expect(mockOpenFieldEditor).toHaveBeenCalledTimes(1);
    expect(mockOpenFieldEditor).toHaveBeenCalledWith(fieldItem.name);
  });

  it('should call openDeleteFieldModal if remove action button is pressed', async () => {
    const { result } = renderUseFieldTableColumns();

    const columns = result.current({
      highlight: '',
      onHide: mockOnHide,
    });

    const { getByTestId } = render(<EuiInMemoryTable items={[fieldItem]} columns={columns} />, {
      wrapper: TestProviders,
    });

    getByTestId('actionDeleteRuntimeField').click();
    expect(mockOpenDeleteFieldModal).toHaveBeenCalledTimes(1);
    expect(mockOpenDeleteFieldModal).toHaveBeenCalledWith(fieldItem.name);
  });
});
