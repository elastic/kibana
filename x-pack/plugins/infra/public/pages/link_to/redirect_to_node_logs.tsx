/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { flowRight } from 'lodash';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

import { LoadingPage } from '../../components/loading_page';
import { replaceLogFilterInQueryString } from '../../containers/logs/log_filter';
import { replaceLogPositionInQueryString } from '../../containers/logs/log_position';
import { replaceSourceIdInQueryString } from '../../containers/source_id';
import { SourceConfigurationFields } from '../../graphql/types';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';
import { useSource } from '../../containers/source/source';
import { findInventoryFields } from '../../../common/inventory_models';
import { InventoryItemType } from '../../../common/inventory_models/types';
import { LinkDescriptor } from '../../hooks/use_link_props';

type RedirectToNodeLogsType = RouteComponentProps<{
  nodeId: string;
  nodeType: InventoryItemType;
  sourceId?: string;
}>;

const getFieldByNodeType = (
  nodeType: InventoryItemType,
  fields: SourceConfigurationFields.Fields
) => {
  const inventoryFields = findInventoryFields(nodeType, fields);
  return inventoryFields.id;
};

export const RedirectToNodeLogs = ({
  match: {
    params: { nodeId, nodeType, sourceId = 'default' },
  },
  location,
}: RedirectToNodeLogsType) => {
  const { source, isLoading } = useSource({ sourceId });
  const configuration = source && source.configuration;

  if (isLoading) {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.redirectToNodeLogs.loadingNodeLogsMessage', {
          defaultMessage: 'Loading {nodeType} logs',
          values: {
            nodeType,
          },
        })}
      />
    );
  }

  if (!configuration) {
    return null;
  }

  const nodeFilter = `${getFieldByNodeType(nodeType, configuration.fields)}: ${nodeId}`;
  const userFilter = getFilterFromLocation(location);
  const filter = userFilter ? `(${nodeFilter}) and (${userFilter})` : nodeFilter;

  const searchString = flowRight(
    replaceLogFilterInQueryString(filter),
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
