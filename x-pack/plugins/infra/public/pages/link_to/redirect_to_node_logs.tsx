/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LinkDescriptor } from '@kbn/observability-plugin/public';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import useMount from 'react-use/lib/useMount';
import { flowRight } from 'lodash';
import { findInventoryFields } from '../../../common/inventory_models';
import { InventoryItemType } from '../../../common/inventory_models/types';
import { LoadingPage } from '../../components/loading_page';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { useLogView } from '../../hooks/use_log_view';
import { replaceLogFilterInQueryString } from '../../observability_logs/log_stream_query_state';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';
import { replaceLogPositionInQueryString } from '../../observability_logs/log_stream_position_state/src/url_state_storage_service';
import { replaceLogViewInQueryString } from '../../observability_logs/log_view_state';

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

  const nodeFilter = `${findInventoryFields(nodeType).id}: ${nodeId}`;
  const userFilter = getFilterFromLocation(location);
  const filter = userFilter ? `(${nodeFilter}) and (${userFilter})` : nodeFilter;
  const time = getTimeFromLocation(location);

  const searchString = flowRight(
    replaceLogFilterInQueryString({ language: 'kuery', query: filter }, time),
    replaceLogPositionInQueryString(time),
    replaceLogViewInQueryString({ type: 'log-view-reference', logViewId })
  )('');

  return <Redirect to={`/stream?${searchString}`} />;
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
