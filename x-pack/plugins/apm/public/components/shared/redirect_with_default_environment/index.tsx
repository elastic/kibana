/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation, useHistory } from 'react-router-dom';
import qs from 'query-string';
import React from 'react';
import { last } from 'lodash';
import { defaultApmServiceEnvironment } from '../../../../../observability/common';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmRouter } from '../../../hooks/use_apm_router';

export function RedirectWithDefaultEnvironment({
  children,
}: {
  children: React.ReactElement;
}) {
  const { core } = useApmPluginContext();

  const apmRouter = useApmRouter();
  const location = useLocation();
  const history = useHistory();

  const query = qs.parse(location.search);

  if ('environment' in query) {
    return children;
  }

  const matchingRoutes = apmRouter.getRoutesToMatch(location.pathname);

  if (last(matchingRoutes)?.path === '/services') {
    const defaultServiceEnvironment =
      core.uiSettings.get<string>(defaultApmServiceEnvironment) ||
      ENVIRONMENT_ALL.value;

    history.replace({
      ...location,
      search: qs.stringify({
        ...query,
        environment: defaultServiceEnvironment,
      }),
    });

    return null;
  }

  return children;
}
