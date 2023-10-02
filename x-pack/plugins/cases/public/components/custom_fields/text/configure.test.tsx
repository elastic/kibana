/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormTestComponent } from '../../../common/test_utils';
import * as i18n from '../translations';
import { Configure } from './configure';

describe('Configure ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Configure />
      </FormTestComponent>
    );

    expect(screen.getByText(i18n.FIELD_OPTION_REQUIRED)).toBeInTheDocument();
  });

  it('updates field options correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Configure />
      </FormTestComponent>
    );

    userEvent.click(screen.getByText(i18n.FIELD_OPTION_REQUIRED));

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith(
        {
          options: {
            required: true,
          },
        },
        true
      );
    });
  });
});
