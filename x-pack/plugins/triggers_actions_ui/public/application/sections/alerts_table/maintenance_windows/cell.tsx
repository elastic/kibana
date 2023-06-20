/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiSkeletonText, EuiToolTip, EuiText } from '@elastic/eui';
import { MaintenanceWindow } from '@kbn/alerting-plugin/common';
import { ALERT_MAINTENANCE_WINDOW_IDS, TIMESTAMP } from '@kbn/rule-data-utils';
import { CellComponentProps } from '../types';
import { TooltipContent } from './tooltip_content';

const isMaintenanceWindowValid = (mw: MaintenanceWindow | undefined): mw is MaintenanceWindow => {
  return !!mw;
};

interface MaintenanceWindowBaseCellProps {
  maintenanceWindows: MaintenanceWindow[];
  timestamp?: string;
  isLoading: boolean;
}

export const MaintenanceWindowBaseCell = memo((props: MaintenanceWindowBaseCellProps) => {
  const { maintenanceWindows, isLoading, timestamp } = props;

  const tooltipWithText = useMemo(() => {
    if (!maintenanceWindows.length) {
      return null;
    }

    return maintenanceWindows.map((mw, index) => {
      return (
        <>
          <EuiToolTip
            key={`${mw.id}_tooltip`}
            content={<TooltipContent maintenanceWindow={mw} timestamp={timestamp} />}
          >
            <EuiText key={`${mw.id}_text`} size="relative">
              {mw.title}
            </EuiText>
          </EuiToolTip>
          {index !== maintenanceWindows.length - 1 && <>,&nbsp;</>}
        </>
      );
    });
  }, [maintenanceWindows, timestamp]);

  return (
    <EuiSkeletonText
      data-test-subj="maintenance-window-cell-loading"
      lines={1}
      isLoading={isLoading}
      size="s"
    >
      {tooltipWithText}
    </EuiSkeletonText>
  );
});

export const MaintenanceWindowCell = memo((props: CellComponentProps) => {
  const { alert, maintenanceWindows, isLoading } = props;

  const validMaintenanceWindows = useMemo(() => {
    const maintenanceWindowIds = alert[ALERT_MAINTENANCE_WINDOW_IDS] || [];
    return maintenanceWindowIds
      .map((id) => maintenanceWindows.get(id))
      .filter(isMaintenanceWindowValid);
  }, [alert, maintenanceWindows]);

  if (validMaintenanceWindows.length === 0) {
    return <>--</>;
  }

  return (
    <MaintenanceWindowBaseCell
      maintenanceWindows={validMaintenanceWindows}
      isLoading={isLoading}
      timestamp={alert[TIMESTAMP]?.[0]}
    />
  );
});

MaintenanceWindowCell.displayName = 'maintenanceWindowCell';
