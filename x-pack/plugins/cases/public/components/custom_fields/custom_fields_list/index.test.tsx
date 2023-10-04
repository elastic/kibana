/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { customFieldsConfigurationMock } from '../../../containers/mock';
import { CustomFieldsList } from '.';

describe('CustomFieldsList', () => {
  let appMockRender: AppMockRenderer;

  const props = {
    customFields: customFieldsConfigurationMock,
    onDeleteCustomField: jest.fn(),
    onEditCustomField: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRender.render(<CustomFieldsList {...props} />);

    expect(screen.getByTestId('custom-fields-list')).toBeInTheDocument();
  });

  it('shows CustomFieldsList correctly', async () => {
    appMockRender.render(<CustomFieldsList {...props} />);

    expect(screen.getByTestId('custom-fields-list')).toBeInTheDocument();

    for (const field of customFieldsConfigurationMock) {
      expect(screen.getByTestId(`custom-field-${field.label}-${field.type}`)).toBeInTheDocument();
    }
  });

  it('shows single CustomFieldsList correctly', async () => {
    appMockRender.render(
      <CustomFieldsList {...{ ...props, customFields: [customFieldsConfigurationMock[0]] }} />
    );

    const list = screen.getByTestId('custom-fields-list');

    expect(list).toBeInTheDocument();
    expect(
      screen.getByTestId(
        `custom-field-${customFieldsConfigurationMock[0].label}-${customFieldsConfigurationMock[0].type}`
      )
    ).toBeInTheDocument();
    expect(
      within(list).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
    ).toBeInTheDocument();
  });

  it('does not show any panel when custom fields', () => {
    appMockRender.render(<CustomFieldsList {...{ ...props, customFields: [] }} />);

    expect(screen.queryAllByTestId(`custom-field-`, { exact: false })).toHaveLength(0);
  });

  describe('Delete', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows confirmation modal when deleting a field ', async () => {
      appMockRender.render(<CustomFieldsList {...props} />);

      const list = screen.getByTestId('custom-fields-list');

      userEvent.click(
        within(list).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
      );

      expect(await screen.findByTestId('confirm-delete-custom-field-modal')).toBeInTheDocument();
    });

    it('calls onDeleteCustomField when confirm', async () => {
      appMockRender.render(<CustomFieldsList {...props} />);

      const list = screen.getByTestId('custom-fields-list');

      userEvent.click(
        within(list).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
      );

      expect(await screen.findByTestId('confirm-delete-custom-field-modal')).toBeInTheDocument();

      userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.queryByTestId('confirm-delete-custom-field-modal')).not.toBeInTheDocument();
        expect(props.onDeleteCustomField).toHaveBeenCalledWith(
          customFieldsConfigurationMock[0].key
        );
      });
    });

    it('does not call onDeleteCustomField when cancel', async () => {
      appMockRender.render(<CustomFieldsList {...props} />);

      const list = screen.getByTestId('custom-fields-list');

      userEvent.click(
        within(list).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
      );

      expect(await screen.findByTestId('confirm-delete-custom-field-modal')).toBeInTheDocument();

      userEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('confirm-delete-custom-field-modal')).not.toBeInTheDocument();
        expect(props.onDeleteCustomField).not.toHaveBeenCalledWith();
      });
    });
  });

  describe('Edit', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls onEditCustomField correctly', async () => {
      appMockRender.render(<CustomFieldsList {...props} />);

      const list = screen.getByTestId('custom-fields-list');

      userEvent.click(
        within(list).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-edit`)
      );

      await waitFor(() => {
        expect(props.onEditCustomField).toHaveBeenCalledWith(customFieldsConfigurationMock[0].key);
      });
    });
  });
});
