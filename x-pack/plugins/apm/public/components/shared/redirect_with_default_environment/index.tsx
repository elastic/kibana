/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation, Redirect } from 'react-router-dom';
import qs from 'query-string';
import React from 'react';
import { defaultApmServiceEnvironment } from '../../../../../observability/common';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

export function RedirectWithDefaultEnvironment({
  children,
}: {
  children: React.ReactElement;
}) {
  const { core } = useApmPluginContext();
  const location = useLocation();

  const query = qs.parse(location.search);

  if ('environment' in query) {
    return children;
  }

  if (location.pathname === '/services' || location.pathname === '/services/') {
    const defaultServiceEnvironment =
      core.uiSettings.get<string>(defaultApmServiceEnvironment) ||
      ENVIRONMENT_ALL.value;

    return (
      <Redirect
        to={qs.stringifyUrl({
          url: location.pathname,
          query: {
            ...query,
            environment: defaultServiceEnvironment,
          },
        })}
      />
    );
  }

  return children;
}
