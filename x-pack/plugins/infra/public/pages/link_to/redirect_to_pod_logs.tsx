/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import compose from 'lodash/fp/compose';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

import { LoadingPage } from '../../components/loading_page';
import { replaceLogFilterInQueryString } from '../../containers/logs/with_log_filter';
import { replaceLogPositionInQueryString } from '../../containers/logs/with_log_position';
import { WithSource } from '../../containers/with_source';
import { getTimeFromLocation } from './query_params';

export const RedirectToPodLogs = ({ match, location }: RouteComponentProps<{ podId: string }>) => (
  <WithSource>
    {({ configuredFields }) => {
      if (!configuredFields) {
        return <LoadingPage message="Loading pod logs" />;
      }

      const searchString = compose(
        replaceLogFilterInQueryString(`${configuredFields.pod}: ${match.params.podId}`),
        replaceLogPositionInQueryString(getTimeFromLocation(location))
      )('');

      return <Redirect to={`/logs?${searchString}`} />;
    }}
  </WithSource>
);

export const getPodLogsUrl = ({ podId, time }: { podId: string; time?: number }) =>
  ['#/link-to/pod-logs/', podId, ...(time ? [`?time=${time}`] : [])].join('');
