/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { ALERT_STATUS, ALERT_CASE_IDS, ALERT_MAINTENANCE_WINDOW_IDS } from '@kbn/rule-data-utils';
import { CellComponentProps, SystemCellComponentMap, SystemCellId } from '../types';
import { DefaultCell } from './default_cell';
import { AlertLifecycleStatusCell } from './alert_lifecycle_status_cell';
import { CasesCell } from '../cases/cell';
import { MaintenanceWindowCell } from '../maintenance_windows/cell';

export const systemCells: SystemCellId[] = [
  ALERT_STATUS,
  ALERT_CASE_IDS,
  ALERT_MAINTENANCE_WINDOW_IDS,
];

const SystemCellFactoryComponent: React.FC<CellComponentProps> = (props) => {
  const { columnId } = props;
  const cellComponents: SystemCellComponentMap = useMemo(
    () => ({
      [ALERT_STATUS]: AlertLifecycleStatusCell,
      [ALERT_CASE_IDS]: CasesCell,
      [ALERT_MAINTENANCE_WINDOW_IDS]: MaintenanceWindowCell,
    }),
    []
  );

  if (cellComponents[columnId]) {
    const CellComponent = cellComponents[columnId];
    return <CellComponent {...props} />;
  }

  return <DefaultCell {...props} />;
};

SystemCellFactoryComponent.displayName = 'SystemCellFactory';

export const SystemCellFactory = memo(SystemCellFactoryComponent);
