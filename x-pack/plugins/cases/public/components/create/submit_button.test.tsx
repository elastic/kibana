/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';

import { SubmitCaseButton } from './submit_button';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import userEvent from '@testing-library/user-event';

describe('SubmitCaseButton', () => {
  let appMockRender: AppMockRenderer;
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <SubmitCaseButton />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('create-case-submit')).toBeInTheDocument();
  });

  it('submits', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <SubmitCaseButton />
      </FormTestComponent>
    );

    userEvent.click(await screen.findByTestId('create-case-submit'));

    await waitFor(() => expect(onSubmit).toBeCalled());
  });

  it('disables when submitting', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <SubmitCaseButton />
      </FormTestComponent>
    );

    const button = await screen.findByTestId('create-case-submit');
    userEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
  });
});
