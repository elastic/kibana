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

    expect(screen.getByTestId('droppable')).toBeInTheDocument();
  });

  it('shows CustomFieldsList correctly', async () => {
    appMockRender.render(<CustomFieldsList {...props} />);

    expect(screen.getByTestId('droppable')).toBeInTheDocument();
    expect(screen.getAllByTestId('draggable').length).toEqual(2);
  });

  it('shows single CustomFieldsList correctly', async () => {
    appMockRender.render(
      <CustomFieldsList {...{ ...props, customFields: [customFieldsConfigurationMock[0]] }} />
    );

    const droppable = screen.getByTestId('droppable');

    expect(droppable).toBeInTheDocument();
    expect(screen.getAllByTestId('draggable').length).toEqual(1);
    expect(
      within(droppable).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
    ).toBeInTheDocument();
  });

  it('does not show droppable field when no custom fields', () => {
    appMockRender.render(<CustomFieldsList {...{ ...props, customFields: [] }} />);

    expect(screen.queryByTestId('droppable')).not.toBeInTheDocument();
  });

  describe('Delete', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows confirmation modal when deleting a field ', async () => {
      appMockRender.render(<CustomFieldsList {...props} />);

      const droppable = screen.getByTestId('droppable');

      userEvent.click(
        within(droppable).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
      );

      expect(await screen.findByTestId('confirm-delete-custom-field-modal')).toBeInTheDocument();
    });

    it('calls onDeleteCustomField when confirm', async () => {
      appMockRender.render(<CustomFieldsList {...props} />);

      const droppable = screen.getByTestId('droppable');

      userEvent.click(
        within(droppable).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
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

      const droppable = screen.getByTestId('droppable');

      userEvent.click(
        within(droppable).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
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

      const droppable = screen.getByTestId('droppable');

      userEvent.click(
        within(droppable).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-edit`)
      );

      await waitFor(() => {
        expect(props.onEditCustomField).toHaveBeenCalledWith(customFieldsConfigurationMock[0].key);
      });
    });
  });
});
