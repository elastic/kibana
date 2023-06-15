/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { useParams } from 'react-router-dom-v5-compat';
import { DEFAULT_LOG_VIEW } from '../../../common/log_views';
import { InventoryItemType } from '../../../common/inventory_models/types';

import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';

export const RedirectToNodeLogs = ({ location }: RouteComponentProps) => {
  const {
    nodeId,
    nodeType,
    logViewId = DEFAULT_LOG_VIEW.logViewId,
  } = useParams<{ nodeId: string; nodeType: InventoryItemType; logViewId?: string }>();
  const {
    services: { locators },
  } = useKibanaContextForPlugin();

  const filter = getFilterFromLocation(location);
  const time = getTimeFromLocation(location);

  useEffect(() => {
    locators.nodeLogsLocator.navigate(
      {
        nodeId: nodeId as string,
        nodeType: nodeType as InventoryItemType,
        time,
        filter,
        logView: { type: 'log-view-reference', logViewId },
      },
      { replace: true }
    );
  }, [filter, locators.nodeLogsLocator, logViewId, nodeId, nodeType, time]);

  return null;
};
