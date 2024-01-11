/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { DefaultCell } from './default_cell';
import { CellComponentProps } from '../types';
import { Alert } from '../../../../types';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';
import { getCasesMockMap } from '../cases/index.mock';
import { getMaintenanceWindowMockMap } from '../maintenance_windows/index.mock';

jest.mock('../../../../common/lib/kibana');

describe('DefaultCell', () => {
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
    showAlertStatusWithFlapping: false,
  };

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('shows the value', async () => {
    appMockRender.render(<DefaultCell {...props} />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('shows empty tag if the value is empty', async () => {
    appMockRender.render(
      <DefaultCell {...props} alert={{ ...alert, 'kibana.alert.status': [] } as unknown as Alert} />
    );
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('shows multiple values', async () => {
    appMockRender.render(
      <DefaultCell
        {...props}
        alert={{ ...alert, 'kibana.alert.status': ['active', 'recovered'] } as Alert}
      />
    );
    expect(screen.getByText('active, recovered')).toBeInTheDocument();
  });
});
