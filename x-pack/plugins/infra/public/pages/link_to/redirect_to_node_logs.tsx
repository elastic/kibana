/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { flowRight } from 'lodash';
import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import useMount from 'react-use/lib/useMount';
import { findInventoryFields } from '../../../common/inventory_models';
import type { InventoryItemType } from '../../../common/inventory_models/types';
import { LoadingPage } from '../../components/loading_page';
import { replaceLogFilterInQueryString } from '../../containers/logs/log_filter/with_log_filter_url_state';
import { replaceLogPositionInQueryString } from '../../containers/logs/log_position/with_log_position_url_state';
import { useLogSource } from '../../containers/logs/log_source/log_source';
import { replaceSourceIdInQueryString } from '../../containers/source_id/source_id';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import type { LinkDescriptor } from '../../hooks/use_link_props';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';

type RedirectToNodeLogsType = RouteComponentProps<{
  nodeId: string;
  nodeType: InventoryItemType;
  sourceId?: string;
}>;

export const RedirectToNodeLogs = ({
  match: {
    params: { nodeId, nodeType, sourceId = 'default' },
  },
  location,
}: RedirectToNodeLogsType) => {
  const { services } = useKibanaContextForPlugin();
  const { isLoading, loadSource, sourceConfiguration } = useLogSource({
    fetch: services.http.fetch,
    sourceId,
    indexPatternsService: services.data.indexPatterns,
  });
  const fields = sourceConfiguration?.configuration.fields;

  useMount(() => {
    loadSource();
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
  } else if (fields == null) {
    return null;
  }

  const nodeFilter = `${findInventoryFields(nodeType, fields).id}: ${nodeId}`;
  const userFilter = getFilterFromLocation(location);
  const filter = userFilter ? `(${nodeFilter}) and (${userFilter})` : nodeFilter;

  const searchString = flowRight(
    replaceLogFilterInQueryString({ language: 'kuery', query: filter }),
    replaceLogPositionInQueryString(getTimeFromLocation(location)),
    replaceSourceIdInQueryString(sourceId)
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
