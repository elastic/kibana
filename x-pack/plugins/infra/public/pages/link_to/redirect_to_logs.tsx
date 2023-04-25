/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { match as RouteMatch, Redirect, RouteComponentProps } from 'react-router-dom';
import { useFetcher } from '@kbn/observability-plugin/public';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { DEFAULT_LOG_VIEW_ID } from '../../observability_logs/log_view_state';

type RedirectToLogsType = RouteComponentProps<{}>;

interface RedirectToLogsProps extends RedirectToLogsType {
  match: RouteMatch<{
    logViewId?: string;
  }>;
}

export const RedirectToLogs = ({ location, match }: RedirectToLogsProps) => {
  const {
    services: { locators },
  } = useKibanaContextForPlugin();

  const logViewId = match.params.logViewId || DEFAULT_LOG_VIEW_ID;
  const filter = getFilterFromLocation(location);
  const time = getTimeFromLocation(location);

  const { data } = useFetcher(() => {
    return locators.logsLocator.getLocation({ time, filter, logViewId });
  }, []);

  return data ? <Redirect to={data.path} /> : null;
};
