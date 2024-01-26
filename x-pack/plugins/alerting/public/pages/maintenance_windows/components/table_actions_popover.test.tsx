/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';
import React from 'react';

import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import { TableActionsPopover } from './table_actions_popover';
import { MaintenanceWindowStatus } from '../../../../common';

describe('TableActionsPopover', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('it renders', () => {
    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        status={MaintenanceWindowStatus.Running}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
      />
    );

    expect(result.getByTestId('table-actions-icon-button')).toBeInTheDocument();
  });

  test('it shows the correct actions when a maintenance window is running', () => {
    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        status={MaintenanceWindowStatus.Running}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
      />
    );
    fireEvent.click(result.getByTestId('table-actions-icon-button'));
    expect(result.getByTestId('table-actions-edit')).toBeInTheDocument();
    expect(result.getByTestId('table-actions-cancel')).toBeInTheDocument();
    expect(result.getByTestId('table-actions-cancel-and-archive')).toBeInTheDocument();
  });

  test('it shows the correct actions when a maintenance window is upcoming', () => {
    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        status={MaintenanceWindowStatus.Upcoming}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
      />
    );
    fireEvent.click(result.getByTestId('table-actions-icon-button'));
    expect(result.getByTestId('table-actions-edit')).toBeInTheDocument();
    expect(result.getByTestId('table-actions-archive')).toBeInTheDocument();
  });

  test('it shows the correct actions when a maintenance window is finished', () => {
    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        status={MaintenanceWindowStatus.Finished}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
      />
    );
    fireEvent.click(result.getByTestId('table-actions-icon-button'));
    expect(result.getByTestId('table-actions-edit')).toBeInTheDocument();
    expect(result.getByTestId('table-actions-archive')).toBeInTheDocument();
  });

  test('it shows the correct actions when a maintenance window is archived', () => {
    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        status={MaintenanceWindowStatus.Archived}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
      />
    );
    fireEvent.click(result.getByTestId('table-actions-icon-button'));
    expect(result.getByTestId('table-actions-unarchive')).toBeInTheDocument();
  });
});
