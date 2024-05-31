/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { TemplateTags } from './template_tags';
import { showEuiComboBoxOptions } from '@elastic/eui/lib/test/rtl';

describe('TemplateTags', () => {
  let appMockRenderer: AppMockRenderer;
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('renders template tags', async () => {
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <TemplateTags isLoading={false} tags={[]} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();
  });

  it('renders loading state', async () => {
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <TemplateTags isLoading={true} tags={[]} />
      </FormTestComponent>
    );

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByLabelText('Loading')).toBeInTheDocument();
  });

  it('shows template tags options', async () => {
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <TemplateTags isLoading={false} tags={['foo', 'bar', 'test']} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();

    await showEuiComboBoxOptions();

    expect(await screen.findByText('foo')).toBeInTheDocument();
  });

  it('adds template tag ', async () => {
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <TemplateTags isLoading={false} tags={[]} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();

    const comboBoxEle = await screen.findByRole('combobox');
    userEvent.paste(comboBoxEle, 'test');
    userEvent.keyboard('{enter}');
    userEvent.paste(comboBoxEle, 'template');
    userEvent.keyboard('{enter}');

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          templateTags: ['test', 'template'],
        },
        true
      );
    });
  });
});
