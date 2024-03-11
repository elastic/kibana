/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { fromQuery, toQuery } from '../links/url_helpers';
import { EnvironmentSelect } from '../environment_select';
import { useEnvironmentsContext } from '../../../context/environments_context/use_environments_context';

function updateEnvironmentUrl(
  history: History,
  location: ReturnType<typeof useLocation>,
  environment: string
) {
  const nextEnvironmentQueryParam = environment;
  history.push({
    ...location,
    search: fromQuery({
      ...toQuery(location.search),
      environment: nextEnvironmentQueryParam,
    }),
  });
}

export function ApmEnvironmentFilter() {
  const { environment, environments, status, rangeFrom, rangeTo, serviceName } =
    useEnvironmentsContext();
  const history = useHistory();
  const location = useLocation();

  if (!rangeFrom || !rangeTo) {
    return null;
  }

  return (
    <EnvironmentSelect
      status={status}
      environment={environment}
      availableEnvironments={environments}
      serviceName={serviceName}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      onChange={(changeValue: string) =>
        updateEnvironmentUrl(history, location, changeValue)
      }
    />
  );
}
