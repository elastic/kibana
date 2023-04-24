/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LinkDescriptor, useFetcher } from '@kbn/observability-plugin/public';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import useMount from 'react-use/lib/useMount';
import { InventoryItemType } from '../../../common/inventory_models/types';
import { LoadingPage } from '../../components/loading_page';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { useLogView } from '../../hooks/use_log_view';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';

type RedirectToNodeLogsType = RouteComponentProps<{
  nodeId: string;
  nodeType: InventoryItemType;
  logViewId?: string;
}>;

export const RedirectToNodeLogs = ({
  match: {
    params: { nodeId, nodeType, logViewId = 'default' },
  },
  location,
}: RedirectToNodeLogsType) => {
  const { services } = useKibanaContextForPlugin();
  const { isLoading, load } = useLogView({
    initialLogViewReference: { type: 'log-view-reference', logViewId },
    logViews: services.logViews.client,
  });

  useMount(() => {
    load();
  });

  const filter = getFilterFromLocation(location);
  const time = getTimeFromLocation(location);

  const { data } = useFetcher(async () => {
    return await services.locators.nodeLogsLocator.getLocation({
      nodeId,
      nodeType,
      time,
      filter,
      logViewId,
    });
  }, []);

  if (isLoading) {
    return (
      <LoadingPage
        data-test-subj={`nodeLoadingPage-${nodeType}`}
        message={i18n.translate('xpack.infra.redirectToNodeLogs.loadingNodeLogsMessage', {
          defaultMessage: 'Loading {nodeType} logs',
          values: {
            nodeType,
          },
        })}
      />
    );
  }

  if (!data) {
    return <EuiSkeletonText lines={1} />;
  }

  return <Redirect to={data.path} />;
};

export const getNodeLogsUrl = ({
  nodeId,
  nodeType,
  time,
}: {
  nodeId: string;
  nodeType: InventoryItemType;
  time?: number;
}): LinkDescriptor => {
  return {
    app: 'logs',
    pathname: `link-to/${nodeType}-logs/${nodeId}`,
    search: time
      ? {
          time: `${time}`,
        }
      : undefined,
  };
};
