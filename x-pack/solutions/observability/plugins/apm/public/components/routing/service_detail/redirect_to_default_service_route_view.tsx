/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { useApmParams } from '../../../hooks/use_apm_params';

export function RedirectToDefaultServiceRouteView() {
  const {
    path: { serviceName },
    query,
  } = useApmParams('/services/{serviceName}/*');

  const search = qs.stringify(query);

  return <Redirect to={{ pathname: `/services/${serviceName}/overview`, search }} />;
}
