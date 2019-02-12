/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import compose from 'lodash/fp/compose';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

import { LoadingPage } from '../../components/loading_page';
import { replaceLogFilterInQueryString } from '../../containers/logs/with_log_filter';
import { replaceLogPositionInQueryString } from '../../containers/logs/with_log_position';
import { WithSource } from '../../containers/with_source';
import { InfraNodeType } from '../../graphql/types';
import { getTimeFromLocation } from './query_params';

type RedirectToNodeLogsType = RouteComponentProps<{
  nodeId: string;
  nodeType: InfraNodeType;
}>;

interface RedirectToNodeLogsProps extends RedirectToNodeLogsType {
  intl: InjectedIntl;
}

export const RedirectToNodeLogs = injectI18n(
  ({
    match: {
      params: { nodeId, nodeType },
    },
    location,
    intl,
  }: RedirectToNodeLogsProps) => (
    <WithSource>
      {({ configuration, isLoading }) => {
        if (isLoading) {
          return (
            <LoadingPage
              message={intl.formatMessage(
                {
                  id: 'xpack.infra.redirectToNodeLogs.loadingNodeLogsMessage',
                  defaultMessage: 'Loading {nodeType} logs',
                },
                {
                  nodeType,
                }
              )}
            />
          );
        }

        if (!configuration) {
          return null;
        }

        const searchString = compose(
          replaceLogFilterInQueryString(`${configuration.fields[nodeType]}: ${nodeId}`),
          replaceLogPositionInQueryString(getTimeFromLocation(location))
        )('');

        return <Redirect to={`/logs?${searchString}`} />;
      }}
    </WithSource>
  )
);

export const getNodeLogsUrl = ({
  nodeId,
  nodeType,
  time,
}: {
  nodeId: string;
  nodeType: InfraNodeType;
  time?: number;
}) => [`#/link-to/${nodeType}-logs/`, nodeId, ...(time ? [`?time=${time}`] : [])].join('');
