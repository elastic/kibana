/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { TemplateFields } from './template_fields';

describe('Template fields', () => {
  let appMockRenderer: AppMockRenderer;
  const onSubmit = jest.fn();
  const defaultProps = {
    isLoading: false,
    configurationTemplateTags: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('renders template fields correctly', async () => {
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <TemplateFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-name-input')).toBeInTheDocument();
    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();
    expect(await screen.findByTestId('template-description-input')).toBeInTheDocument();
  });

  it('calls onSubmit with template fields', async () => {
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <TemplateFields {...defaultProps} />
      </FormTestComponent>
    );

    userEvent.paste(await screen.findByTestId('template-name-input'), 'Template 1');

    const templateTags = await screen.findByTestId('template-tags');

    userEvent.paste(within(templateTags).getByRole('combobox'), 'first');
    userEvent.keyboard('{enter}');

    userEvent.paste(
      await screen.findByTestId('template-description-input'),
      'this is a first template'
    );

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          name: 'Template 1',
          templateDescription: 'this is a first template',
          templateTags: ['first'],
        },
        true
      );
    });
  });
});
