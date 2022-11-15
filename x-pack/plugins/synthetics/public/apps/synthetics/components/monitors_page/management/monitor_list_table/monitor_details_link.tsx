/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiIcon } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { selectSelectedLocationId } from '../../../../state';
import {
  ConfigKey,
  EncryptedSyntheticsSavedMonitor,
  SourceType,
} from '../../../../../../../common/runtime_types';
import { useMonitorDetailLocator } from '../../hooks/use_monitor_detail_locator';
import * as labels from './labels';

export const MonitorDetailsLink = ({
  basePath,
  monitor,
}: {
  basePath: string;
  monitor: EncryptedSyntheticsSavedMonitor;
}) => {
  const lastSelectedLocationId = useSelector(selectSelectedLocationId);
  const monitorHasLocation = monitor[ConfigKey.LOCATIONS]?.find(
    (loc) => loc.id === lastSelectedLocationId
  );

  const firstMonitorLocationId = monitor[ConfigKey.LOCATIONS]?.[0]?.id;
  const locationId =
    lastSelectedLocationId && monitorHasLocation ? lastSelectedLocationId : firstMonitorLocationId;

  const monitorDetailLinkUrl = useMonitorDetailLocator({
    monitorId: monitor[ConfigKey.CONFIG_ID],
    locationId,
  });

  const isProjectMonitor = monitor[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT;

  return (
    <>
      <EuiLink href={monitorDetailLinkUrl}>{monitor.name}</EuiLink>
      {isProjectMonitor ? (
        <EuiIcon
          title={labels.PROJECT_MONITOR_DESC}
          aria-label={labels.PROJECT_MONITOR_DESC}
          type="symlink"
          size="s"
          css={{ margin: 4 }}
        />
      ) : null}
    </>
  );
};
