/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { SystemCellFactory } from '.';
import { CellComponentProps } from '../types';
import { Alert } from '../../../../types';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';
import { getCasesMockMap } from '../cases/index.mock';
import { getMaintenanceWindowMockMap } from '../maintenance_windows/index.mock';

jest.mock('../../../../common/lib/kibana');

describe('SystemCellFactory', () => {
  const casesMap = getCasesMockMap();
  const maintenanceWindowsMap = getMaintenanceWindowMockMap();

  const alert = {
    _id: 'alert-id',
    _index: 'alert-index',
    'kibana.alert.status': ['active'],
    'kibana.alert.case_ids': ['test-id'],
    'kibana.alert.maintenance_window_ids': ['test-mw-id-1'],
  } as Alert;

  const props: CellComponentProps = {
    isLoading: false,
    alert,
    cases: casesMap,
    maintenanceWindows: maintenanceWindowsMap,
    columnId: 'kibana.alert.status',
    showAlertStatusWithFlapping: true,
  };

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('shows the status cell', async () => {
    appMockRender.render(<SystemCellFactory {...props} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows the cases cell', async () => {
    appMockRender.render(<SystemCellFactory {...props} columnId="kibana.alert.case_ids" />);
    expect(screen.getByText('Test case')).toBeInTheDocument();
  });

  it('shows the maintenance windows cell', async () => {
    appMockRender.render(
      <SystemCellFactory {...props} columnId="kibana.alert.maintenance_window_ids" />
    );
    expect(screen.getByText('test-title')).toBeInTheDocument();
  });

  it('shows the cell if the columnId is not registered to the map', async () => {
    // @ts-expect-error: columnId is typed to accept only status & case_ids
    appMockRender.render(<SystemCellFactory {...props} columnId="kibana.alert.end" />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });
});
