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
import { templatesConfigurationMock } from '../../containers/mock';
import { TemplateSelector } from './templates';

describe('TemplateSelector', () => {
  let appMockRender: AppMockRenderer;
  const onTemplateChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  afterEach(async () => {
    await appMockRender.clearQueryCache();
  });

  it('renders correctly', async () => {
    appMockRender.render(
      <TemplateSelector
        isLoading={false}
        templates={templatesConfigurationMock}
        onTemplateChange={onTemplateChange}
      />
    );

    expect(await screen.findByText('Template name')).toBeInTheDocument();
    expect(await screen.findByTestId('create-case-template-select')).toBeInTheDocument();
  });

  it('selects a template correctly', async () => {
    const selectedTemplate = templatesConfigurationMock[2];

    appMockRender.render(
      <TemplateSelector
        isLoading={false}
        templates={templatesConfigurationMock}
        onTemplateChange={onTemplateChange}
      />
    );

    expect(onTemplateChange).not.toHaveBeenCalled();

    userEvent.selectOptions(
      await screen.findByTestId('create-case-template-select'),
      selectedTemplate.key
    );

    await waitFor(() => {
      expect(onTemplateChange).toHaveBeenCalledWith({
        caseFields: selectedTemplate.caseFields,
        key: selectedTemplate.key,
      });
    });
  });

  it('shows selected template as default', async () => {
    const templateToSelect = templatesConfigurationMock[1];

    appMockRender.render(
      <TemplateSelector
        isLoading={false}
        templates={templatesConfigurationMock}
        onTemplateChange={onTemplateChange}
        initialTemplate={templateToSelect}
      />
    );

    expect(await screen.findByText(templateToSelect.name)).toBeInTheDocument();
  });

  it('updates selected template correctly', async () => {
    const templateToSelect = templatesConfigurationMock[1];
    const newTemplate = templatesConfigurationMock[2];

    appMockRender.render(
      <TemplateSelector
        isLoading={false}
        templates={templatesConfigurationMock}
        onTemplateChange={onTemplateChange}
        initialTemplate={templateToSelect}
      />
    );

    expect(await screen.findByText(templateToSelect.name)).toBeInTheDocument();

    userEvent.selectOptions(
      await screen.findByTestId('create-case-template-select'),
      newTemplate.key
    );

    await waitFor(() => {
      expect(onTemplateChange).toHaveBeenCalledWith({
        caseFields: newTemplate.caseFields,
        key: newTemplate.key,
      });
    });
  });

  it('shows the selected option correctly', async () => {
    const selectedTemplate = templatesConfigurationMock[2];

    appMockRender.render(
      <TemplateSelector
        isLoading={false}
        templates={templatesConfigurationMock}
        onTemplateChange={onTemplateChange}
      />
    );

    userEvent.selectOptions(
      await screen.findByTestId('create-case-template-select'),
      selectedTemplate.key
    );

    expect(
      (await screen.findByRole<HTMLOptionElement>('option', { name: selectedTemplate.name }))
        .selected
    ).toBe(true);
  });
});
