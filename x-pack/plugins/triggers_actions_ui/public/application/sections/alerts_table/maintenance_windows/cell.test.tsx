/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { screen, render } from '@testing-library/react';
import { ALERT_MAINTENANCE_WINDOW_IDS } from '@kbn/rule-data-utils';
import { MaintenanceWindowCell } from './cell';
import { CellComponentProps } from '../types';
import { Alert } from '../../../../types';
import { getMaintenanceWindowMockMap } from './index.mock';
import { getCasesMockMap } from '../cases/index.mock';
import userEvent from '@testing-library/user-event';

const casesMap = getCasesMockMap();
const maintenanceWindowsMap = getMaintenanceWindowMockMap();
const alert = {
  _id: 'alert-id',
  _index: 'alert-index',
  [ALERT_MAINTENANCE_WINDOW_IDS]: ['test-mw-id-1'],
} as Alert;

const props: CellComponentProps = {
  isLoading: false,
  alert,
  cases: casesMap,
  maintenanceWindows: maintenanceWindowsMap,
  columnId: ALERT_MAINTENANCE_WINDOW_IDS,
  showAlertStatusWithFlapping: false,
};

describe('MaintenanceWindowCell', () => {
  it('renders the maintenance window cell', async () => {
    render(<MaintenanceWindowCell {...props} />);
    expect(screen.getByText('test-title')).toBeInTheDocument();
  });

  it('renders the loading skeleton', async () => {
    render(<MaintenanceWindowCell {...props} isLoading={true} />);
    expect(screen.getByTestId('maintenance-window-cell-loading')).toBeInTheDocument();
  });

  it('shows the tooltip', async () => {
    render(<MaintenanceWindowCell {...props} />);
    expect(screen.getByText('test-title')).toBeInTheDocument();
    userEvent.hover(screen.getByText('test-title'));
    expect(await screen.findByTestId('maintenance-window-tooltip-content')).toBeInTheDocument();
  });
});
