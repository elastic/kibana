/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { AlertLifecycleStatusCell } from './alert_lifecycle_status_cell';
import { CellComponentProps } from '../types';
import { Alert } from '../../../../types';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';
import { getCasesMockMap } from '../cases/index.mock';
import { getMaintenanceWindowMockMap } from '../maintenance_windows/index.mock';

jest.mock('../../../../common/lib/kibana');

describe('AlertLifecycleStatusCell', () => {
  const casesMap = getCasesMockMap();
  const maintenanceWindowsMap = getMaintenanceWindowMockMap();
  const alert = {
    _id: 'alert-id',
    _index: 'alert-index',
    'kibana.alert.status': ['active'],
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

  it('shows the status', async () => {
    appMockRender.render(<AlertLifecycleStatusCell {...props} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('does not shows the status if showAlertStatusWithFlapping=false', async () => {
    appMockRender.render(
      <AlertLifecycleStatusCell {...props} showAlertStatusWithFlapping={false} />
    );
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('shows the status with flapping', async () => {
    appMockRender.render(
      <AlertLifecycleStatusCell
        {...props}
        alert={{ ...alert, 'kibana.alert.flapping': ['true'] } as Alert}
      />
    );
    expect(screen.getByText('Flapping')).toBeInTheDocument();
  });

  it('shows the status with multiple values', async () => {
    appMockRender.render(
      <AlertLifecycleStatusCell
        {...props}
        alert={{ ...alert, 'kibana.alert.status': ['active', 'recovered'] } as Alert}
      />
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows the default cell if the status is empty', async () => {
    appMockRender.render(
      <AlertLifecycleStatusCell
        {...props}
        alert={{ ...alert, 'kibana.alert.status': [] } as unknown as Alert}
      />
    );

    expect(screen.getByText('--')).toBeInTheDocument();
  });
});
