/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { InlineEdit } from './inline_edit';
import type { ListOption } from './list_options';

describe('InlineEdit', () => {
  let appMockRender: AppMockRenderer;
  const listValues: ListOption[] = [{ id: '1', content: 'option 1' }];

  const props = {
    disabled: false,
    isLoading: false,
    onChange: jest.fn(),
    listValues,
    isEditingEnabled: false,
    handleEditingEnabled: jest.fn(),
    listOption: { id: '1', content: 'option 1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders read mode correctly', () => {
    appMockRender.render(<InlineEdit {...props} />);

    expect(screen.getByTestId('euiInlineReadModeButton')).toBeInTheDocument();
    expect(screen.getByText('option 1')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-remove-list-option')).toBeInTheDocument();
  });

  it('renders empty edit mode correctly', async () => {
    appMockRender.render(
      <InlineEdit {...{ ...props, isEditingEnabled: true, listOption: { id: 'a', content: '' } }} />
    );

    expect(screen.getByTestId('euiInlineEditModeInput')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-remove-list-option')).toBeInTheDocument();
  });

  it('renders edit mode correctly with content', async () => {
    appMockRender.render(<InlineEdit {...{ ...props, isEditingEnabled: true }} />);

    expect(screen.getByTestId('euiInlineEditModeInput')).toHaveAttribute(
      'value',
      props.listOption.content
    );
  });

  it('renders loading state correctly', async () => {
    appMockRender.render(<InlineEdit {...{ ...props, isLoading: true, isEditingEnabled: true }} />);

    expect(screen.getAllByTestId('euiSkeletonLoadingAriaWrapper')[0]).toBeInTheDocument();
  });

  it('renders correctly when disabled', () => {
    appMockRender.render(<InlineEdit {...{ ...props, isEditingEnabled: true, disabled: true }} />);

    expect(screen.getByTestId('euiInlineEditModeInput')).toHaveAttribute('disabled');
    expect(screen.getByTestId('custom-field-remove-list-option')).toHaveAttribute('disabled');
  });

  it('calls on change while updating input', async () => {
    appMockRender.render(<InlineEdit {...{ ...props, isEditingEnabled: true }} />);

    const input = screen.getByTestId('euiInlineEditModeInput');

    userEvent.clear(input);
    userEvent.type(input, 'hello');

    userEvent.click(screen.getByTestId('euiInlineEditModeSaveButton'));

    expect(props.onChange).toHaveBeenCalledWith([{ id: props.listOption.id, content: 'hello' }]);
  });

  it('calls on change with correct updated array when multiple options available', async () => {
    const newListOption = { id: '2', content: '' };

    appMockRender.render(
      <InlineEdit
        {...{
          ...props,
          isEditingEnabled: true,
          listValues: [...listValues, newListOption],
          listOption: newListOption,
        }}
      />
    );

    const input = screen.getByTestId('euiInlineEditModeInput');

    userEvent.clear(input);
    userEvent.type(input, 'next');

    userEvent.click(screen.getByTestId('euiInlineEditModeSaveButton'));

    expect(props.onChange).toHaveBeenCalledWith([...listValues, { id: '2', content: 'next' }]);
  });

  it('does not call onchange on cancel', async () => {
    appMockRender.render(<InlineEdit {...{ ...props, isEditingEnabled: true }} />);

    const input = screen.getByTestId('euiInlineEditModeInput');

    userEvent.clear(input);
    userEvent.type(input, 'hello');

    userEvent.click(screen.getByTestId('euiInlineEditModeCancelButton'));

    expect(props.onChange).not.toBeCalled();

    expect(screen.getByTestId('euiInlineReadModeButton')).toBeInTheDocument();
    expect(screen.queryByText('hello')).not.toBeInTheDocument();
  });

  it('calls on change with updated array on delete', async () => {
    appMockRender.render(<InlineEdit {...{ ...props, isEditingEnabled: true }} />);

    userEvent.click(screen.getByTestId('custom-field-remove-list-option'));

    expect(props.onChange).toHaveBeenCalledWith([]);
  });

  it('calls on change with updated array on delete when multiple options available', async () => {
    const newListOption = { id: '2', content: '' };

    appMockRender.render(
      <InlineEdit
        {...{
          ...props,
          isEditingEnabled: true,
          listValues: [...listValues, newListOption],
          listOption: newListOption,
        }}
      />
    );

    userEvent.click(screen.getByTestId('custom-field-remove-list-option'));

    expect(props.onChange).toHaveBeenCalledWith(listValues);
  });
});
