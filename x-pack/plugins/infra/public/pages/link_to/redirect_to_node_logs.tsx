/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { DEFAULT_LOG_VIEW, getLogsLocatorsFromUrlService } from '@kbn/logs-shared-plugin/common';
import { findInventoryFields, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';

import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';

type RedirectToNodeLogsType = RouteComponentProps<{
  nodeId: string;
  nodeType: InventoryItemType;
  logViewId?: string;
}>;

export const RedirectToNodeLogs = ({
  match: {
    params: { nodeId, nodeType, logViewId = DEFAULT_LOG_VIEW.logViewId },
  },
  location,
}: RedirectToNodeLogsType) => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();
  const { nodeLogsLocator } = getLogsLocatorsFromUrlService(share.url);

  const filter = getFilterFromLocation(location);
  const time = getTimeFromLocation(location);

  useEffect(() => {
    nodeLogsLocator.navigate(
      {
        nodeField: findInventoryFields(nodeType).id,
        nodeId,
        time,
        filter,
        logView: { type: 'log-view-reference', logViewId },
      },
      { replace: true }
    );
  }, [filter, nodeLogsLocator, logViewId, nodeId, nodeType, time]);

  return null;
};
