/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flowRight } from 'lodash';
import React from 'react';
import type { match as RouteMatch, RouteComponentProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import { replaceLogFilterInQueryString } from '../../containers/logs/log_filter/with_log_filter_url_state';
import { replaceLogPositionInQueryString } from '../../containers/logs/log_position/with_log_position_url_state';
import { replaceSourceIdInQueryString } from '../../containers/source_id/source_id';
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
  const searchString = flowRight(
    replaceLogFilterInQueryString({ language: 'kuery', query: filter }),
    replaceLogPositionInQueryString(getTimeFromLocation(location)),
    replaceSourceIdInQueryString(sourceId)
  )('');

  return <Redirect to={`/stream?${searchString}`} />;
};
