/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { History } from 'history';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { fromQuery, toQuery } from '../links/url_helpers';
import { useEnvironmentsContext } from '../../../context/environments_context/use_environments_context';
import { EnvironmentSelect } from '../environment_select';
import { ServiceEnvironmentSelect } from '../service_environment_select';

function updateEnvironmentUrl(
  history: History,
  location: ReturnType<typeof useLocation>,
  environment?: string
) {
  const nextEnvironmentQueryParam = environment;
  history.push({
    ...location,
    search: fromQuery({
      ...toQuery(location.search),
      ...(environment &&
        environment.length > 0 && { environment: nextEnvironmentQueryParam }),
    }),
  });
}

export function ApmEnvironmentFilter() {
  const { environment, serviceName, start, end } = useEnvironmentsContext();
  const history = useHistory();
  const location = useLocation();

  const prepend = i18n.translate('xpack.apm.filter.environment.label', {
    defaultMessage: 'Environment',
  });

  return serviceName ? (
    <ServiceEnvironmentSelect
      prepend={prepend}
      onChange={(changeValue) =>
        updateEnvironmentUrl(history, location, changeValue)
      }
      start={start}
      end={end}
      environment={environment}
      serviceName={serviceName}
    />
  ) : (
    <EnvironmentSelect
      prepend={prepend}
      onChange={(changeValue) =>
        updateEnvironmentUrl(history, location, changeValue)
      }
      start={start}
      end={end}
      environment={environment}
    />
  );
}
