/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { match as RouteMatch, Redirect, RouteComponentProps } from 'react-router-dom';
import { flowRight } from 'lodash';
import { replaceSourceIdInQueryString } from '../../containers/source_id';
import { replaceLogPositionInQueryString } from '../../observability_logs/log_stream_position_state/src/url_state_storage_service';
import { replaceLogFilterInQueryString } from '../../observability_logs/log_stream_query_state';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';

type RedirectToLogsType = RouteComponentProps<{}>;

interface RedirectToLogsProps extends RedirectToLogsType {
  match: RouteMatch<{
    sourceId?: string;
  }>;
}

export const RedirectToLogs = ({ location, match }: RedirectToLogsProps) => {
  const sourceId = match.params.sourceId || 'default';
  const filter = getFilterFromLocation(location);
  const time = getTimeFromLocation(location);
  const searchString = flowRight(
    replaceLogFilterInQueryString({ language: 'kuery', query: filter }, time),
    replaceLogPositionInQueryString(time),
    replaceSourceIdInQueryString(sourceId)
  )('');

  return <Redirect to={`/stream?${searchString}`} />;
};
