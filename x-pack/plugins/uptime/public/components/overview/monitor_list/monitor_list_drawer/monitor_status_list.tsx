/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { LocationLink } from '../../../common/location_link';
import { MonitorStatusRow } from './monitor_status_row';
import { Ping } from '../../../../../common/runtime_types';
import { STATUS, UNNAMED_LOCATION } from '../../../../../common/constants';

interface MonitorStatusListProps {
  /**
   * Recent List of pings performed on monitor
   */
  summaryPings: Ping[];
}

export const MonitorStatusList = ({ summaryPings }: MonitorStatusListProps) => {
  const upChecks: Set<string> = new Set();
  const downChecks: Set<string> = new Set();

  summaryPings.forEach((ping: Ping) => {
    // Doing this way because name is either string or null, get() default value only works on undefined value
    const location = ping.observer?.geo?.name ?? UNNAMED_LOCATION;

    if (ping.monitor.status === STATUS.UP) {
      upChecks.add(location);
    } else if (ping.monitor.status === STATUS.DOWN) {
      downChecks.add(location);
    }
  });

  // if monitor is down in one dns, it will be considered down so removing it from up list
  const absUpChecks: Set<string> = new Set([...upChecks].filter((item) => !downChecks.has(item)));

  return (
    <>
      <EuiFlexGroup style={{ maxWidth: 1000 }}>
        {downChecks.size > 0 && (
          <EuiFlexItem>
            <MonitorStatusRow locationNames={downChecks} status={STATUS.DOWN} />
          </EuiFlexItem>
        )}
        {absUpChecks.size > 0 && (
          <EuiFlexItem>
            <MonitorStatusRow locationNames={absUpChecks} status={STATUS.UP} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {(downChecks.has(UNNAMED_LOCATION) || upChecks.has(UNNAMED_LOCATION)) && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut color="warning">
            <FormattedMessage
              id="xpack.uptime.monitorList.drawer.missingLocation"
              defaultMessage="Some heartbeat instances do not have a location defined. {link} to your heartbeat configuration."
              values={{ link: <LocationLink /> }}
            />
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
    </>
  );
};
