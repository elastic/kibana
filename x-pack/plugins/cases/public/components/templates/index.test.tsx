/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

import { MAX_TEMPLATES_LENGTH } from '../../../common/constants';
import { Templates } from '.';
import * as i18n from './translations';
import { templatesConfigurationMock } from '../../containers/mock';

// FLAKY: https://github.com/elastic/kibana/issues/196628
describe('Templates', () => {
  let appMockRender: AppMockRenderer;

  const props = {
    disabled: false,
    isLoading: false,
    templates: [],
    onAddTemplate: jest.fn(),
    onEditTemplate: jest.fn(),
    onDeleteTemplate: jest.fn(),
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    appMockRender.render(<Templates {...props} />);

    expect(await screen.findByTestId('templates-form-group')).toBeInTheDocument();
    expect(await screen.findByTestId('add-template')).toBeInTheDocument();
  });

  it('renders empty templates correctly', async () => {
    appMockRender.render(<Templates {...{ ...props, templates: [] }} />);

    expect(await screen.findByTestId('add-template')).toBeInTheDocument();
    expect(await screen.findByTestId('empty-templates')).toBeInTheDocument();
    expect(await screen.queryByTestId('templates-list')).not.toBeInTheDocument();
  });

  it('renders templates correctly', async () => {
    appMockRender.render(<Templates {...{ ...props, templates: templatesConfigurationMock }} />);

    expect(await screen.findByTestId('add-template')).toBeInTheDocument();
    expect(await screen.findByTestId('templates-list')).toBeInTheDocument();
  });

  it('renders loading state correctly', async () => {
    appMockRender.render(<Templates {...{ ...props, isLoading: true }} />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('renders disabled state correctly', async () => {
    appMockRender.render(<Templates {...{ ...props, disabled: true }} />);

    expect(await screen.findByTestId('add-template')).toHaveAttribute('disabled');
  });

  it('calls onChange on add option click', async () => {
    appMockRender.render(<Templates {...props} />);

    await userEvent.click(await screen.findByTestId('add-template'));

    expect(props.onAddTemplate).toBeCalled();
  });

  it('calls onEditTemplate correctly', async () => {
    appMockRender.render(<Templates {...{ ...props, templates: templatesConfigurationMock }} />);

    const list = await screen.findByTestId('templates-list');

    expect(list).toBeInTheDocument();

    await userEvent.click(
      await within(list).findByTestId(`${templatesConfigurationMock[0].key}-template-edit`)
    );

    await waitFor(() => {
      expect(props.onEditTemplate).toHaveBeenCalledWith(templatesConfigurationMock[0].key);
    });
  });

  it('calls onDeleteTemplate correctly', async () => {
    appMockRender.render(<Templates {...{ ...props, templates: templatesConfigurationMock }} />);

    const list = await screen.findByTestId('templates-list');

    await userEvent.click(
      await within(list).findByTestId(`${templatesConfigurationMock[0].key}-template-delete`)
    );

    expect(await screen.findByTestId('confirm-delete-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByText('Delete'));

    await waitFor(() => {
      expect(props.onDeleteTemplate).toHaveBeenCalledWith(templatesConfigurationMock[0].key);
    });
  });

  it('shows the experimental badge', async () => {
    appMockRender.render(<Templates {...props} />);

    expect(await screen.findByTestId('case-experimental-badge')).toBeInTheDocument();
  });

  it('shows error when templates reaches the limit', async () => {
    const mockTemplates = [];

    for (let i = 0; i < MAX_TEMPLATES_LENGTH; i++) {
      mockTemplates.push({
        key: `field_key_${i + 1}`,
        name: `template_${i + 1}`,
        description: 'random foobar',
        caseFields: null,
      });
    }

    appMockRender.render(<Templates {...{ ...props, templates: mockTemplates }} />);

    expect(await screen.findByText(i18n.MAX_TEMPLATE_LIMIT(MAX_TEMPLATES_LENGTH)));
    expect(screen.queryByTestId('add-template')).not.toBeInTheDocument();
  });
});
