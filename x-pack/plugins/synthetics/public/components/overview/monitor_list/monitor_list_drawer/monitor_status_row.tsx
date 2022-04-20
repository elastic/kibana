/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiSpacer } from '@elastic/eui';
import { UNNAMED_LOCATION, STATUS } from '../../../../../common/constants';
import { getHealthMessage } from '../columns/monitor_status_column';

interface MonitorStatusRowProps {
  /**
   * Recent List of checks performed on monitor
   */
  locationNames: Set<string>;
  /**
   * Monitor status for this of locations
   */
  status: string;
}

export const MonitorStatusRow = ({ locationNames, status }: MonitorStatusRowProps) => {
  const color = status === STATUS.UP ? 'success' : 'danger';

  let checkListArray = [...locationNames];
  // If un-named location exists, move it to end
  if (locationNames.has(UNNAMED_LOCATION)) {
    checkListArray = checkListArray.filter((item) => item !== UNNAMED_LOCATION);
    checkListArray.push(UNNAMED_LOCATION);
  }

  const locations = checkListArray.join(', ');
  return (
    <span>
      <EuiBadge color={color}>{getHealthMessage(status)}</EuiBadge>
      <EuiSpacer size="xs" />
      <span
        aria-label={i18n.translate('xpack.uptime.monitorList.drawer.statusRowLocationList', {
          defaultMessage: 'A list of locations with "{status}" status when last checked.',
          values: { status },
        })}
      >
        {locations || '--'}
      </span>
      <EuiSpacer size="xs" />
    </span>
  );
};
