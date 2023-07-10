/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { DEFAULT_LOG_VIEW } from '@kbn/logs-shared-plugin/common';
import { InventoryItemType } from '../../../common/inventory_models/types';

import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';

export const RedirectToNodeLogs = () => {
  const location = useLocation();
  const {
    nodeId,
    nodeType,
    logViewId = DEFAULT_LOG_VIEW.logViewId,
  } = useParams<{
    nodeId: string;
    nodeType: InventoryItemType;
    logViewId?: string;
  }>();
  const {
    services: { locators },
  } = useKibanaContextForPlugin();

  const filter = getFilterFromLocation(location);
  const time = getTimeFromLocation(location);

  useEffect(() => {
    locators.nodeLogsLocator.navigate(
      {
        nodeId,
        nodeType,
        time,
        filter,
        logView: { type: 'log-view-reference', logViewId },
      },
      { replace: true }
    );
  }, [filter, locators.nodeLogsLocator, logViewId, nodeId, nodeType, time]);

  return null;
};
