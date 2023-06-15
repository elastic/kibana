/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiLink, EuiSkeletonText, EuiToolTip } from '@elastic/eui';
import {
  MaintenanceWindow,
  MAINTENANCE_WINDOW_DEEP_LINK_IDS,
  MANAGEMENT_APP_ID,
} from '@kbn/alerting-plugin/common';
import { ALERT_MAINTENANCE_WINDOW_IDS } from '@kbn/rule-data-utils';
import { CellComponentProps } from '../types';
import { useKibana } from '../../../../common/lib/kibana';
import { TooltipContent } from './tooltip_content';

const isMaintenanceWindowValid = (mw: MaintenanceWindow | undefined): mw is MaintenanceWindow => {
  return !!mw;
};

interface MaintenanceWindowBaseCellProps {
  maintenanceWindows: MaintenanceWindow[];
  isLoading: boolean;
}

export const MaintenanceWindowBaseCell = memo((props: MaintenanceWindowBaseCellProps) => {
  const { maintenanceWindows, isLoading } = props;

  const {
    application: { getUrlForApp },
  } = useKibana().services;

  const tooltipWithLink = useMemo(() => {
    if (!maintenanceWindows.length) {
      return null;
    }

    return maintenanceWindows.map((mw, index) => {
      return (
        <>
          <EuiToolTip key={mw.id} content={<TooltipContent maintenanceWindow={mw} />}>
            <EuiLink
              href={getUrlForApp(MANAGEMENT_APP_ID, {
                deepLinkId: MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows,
                path: '/',
              })}
            >
              {mw.title}
            </EuiLink>
          </EuiToolTip>
          {index !== maintenanceWindows.length - 1 && <>,&nbsp;</>}
        </>
      );
    });
  }, [maintenanceWindows, getUrlForApp]);

  return (
    <EuiSkeletonText
      data-test-subj="maintenance-window-cell-loading"
      lines={1}
      isLoading={isLoading}
      size="s"
    >
      {tooltipWithLink}
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
    <MaintenanceWindowBaseCell maintenanceWindows={validMaintenanceWindows} isLoading={isLoading} />
  );
});

MaintenanceWindowCell.displayName = 'maintenanceWindowCell';
