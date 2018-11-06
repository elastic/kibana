/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import compose from 'lodash/fp/compose';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

import { InfraNodeType } from 'x-pack/plugins/infra/common/graphql/types';
import { LoadingPage } from '../../components/loading_page';
import { replaceLogFilterInQueryString } from '../../containers/logs/with_log_filter';
import { replaceLogPositionInQueryString } from '../../containers/logs/with_log_position';
import { WithSource } from '../../containers/with_source';
import { getTimeFromLocation } from './query_params';

type RedirectToNodeLogsProps = RouteComponentProps<{
  nodeName: string;
  nodeType: InfraNodeType;
}>;

export const RedirectToNodeLogs = ({
  match: {
    params: { nodeName, nodeType },
  },
  location,
}: RedirectToNodeLogsProps) => (
  <WithSource>
    {({ configuredFields }) => {
      if (!configuredFields) {
        return (
          <LoadingPage
            message={i18n.translate('xpack.infra.redirectToNodeLogs.loadingNodeTypeLogsMessage', {
              defaultMessage: 'Loading {nodeType} logs',
              values: {
                nodeType,
              },
            })}
          />
        );
      }

      const searchString = compose(
        replaceLogFilterInQueryString(`${configuredFields[nodeType]}: ${nodeName}`),
        replaceLogPositionInQueryString(getTimeFromLocation(location))
      )('');

      return <Redirect to={`/logs?${searchString}`} />;
    }}
  </WithSource>
);

export const getNodeLogsUrl = ({
  nodeName,
  nodeType,
  time,
}: {
  nodeName: string;
  nodeType: InfraNodeType;
  time?: number;
}) => [`#/link-to/${nodeType}-logs/`, nodeName, ...(time ? [`?time=${time}`] : [])].join('');
