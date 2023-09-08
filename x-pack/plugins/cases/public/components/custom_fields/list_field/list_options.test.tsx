/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/dom';

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { ListOptions } from './list_options';
import type { ListOption } from './list_options';
import * as i18n from '../translations';

describe('FieldTypeDropdown', () => {
  let appMockRender: AppMockRenderer;
  const listValues: ListOption[] = [];

  const props = {
    disabled: false,
    isLoading: false,
    onChange: jest.fn(),
    listValues,
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    appMockRender.render(<ListOptions {...props} />);

    expect(screen.getByTestId('custom-field-add-list-option-btn')).toBeInTheDocument();
    expect(screen.getByText(i18n.LIST_VALUES_LABEL)).toBeInTheDocument();
  });

  it('renders loading state correctly', () => {
    appMockRender.render(<ListOptions {...{ ...props, isLoading: true }} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders disabled state correctly', () => {
    appMockRender.render(<ListOptions {...{ ...props, disabled: true }} />);

    expect(screen.getByTestId('custom-field-add-list-option-btn')).toHaveAttribute('disabled');
  });

  it('calls onChange on add option click', async () => {
    appMockRender.render(<ListOptions {...props} />);

    userEvent.click(screen.getByTestId('custom-field-add-list-option-btn'));

    expect(props.onChange).toBeCalledWith([{id: '1', content: ''}]);
  });
});
