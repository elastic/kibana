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
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../common/environment_filter_values';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { fromQuery, toQuery } from '../links/url_helpers';
import { Environment } from '../../../../common/environment_rt';
import { useEnvironmentsContext } from '../../../context/environments_context/use_environments_context';
import { SuggestionsSelect } from '../suggestions_select';
import { SuggestionsSelectWithTerm } from '../suggestions_select/suggestions_select_with_term';

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

// #NOTE do we want ENVIRONMENT_NOT_DEFINED with suggestionSelect

export function ApmEnvironmentFilter() {
  const { environment, serviceName, start, end } = useEnvironmentsContext();

  return serviceName ? (
    <ServiceEnvironmentFilter
      start={start}
      end={end}
      environment={environment}
      termValue={serviceName}
    />
  ) : (
    <EnvironmentFilter start={start} end={end} environment={environment} />
  );
}

export function EnvironmentFilter({
  environment,
  start,
  end,
}: {
  environment: Environment;
  start?: string;
  end?: string;
}) {
  const history = useHistory();
  const location = useLocation();

  return (
    <SuggestionsSelect
      allOption={ENVIRONMENT_ALL}
      placeholder={i18n.translate('xpack.apm.filter.environment.placeholder', {
        defaultMessage: 'Select environment',
      })}
      prepend={i18n.translate('xpack.apm.filter.environment.label', {
        defaultMessage: 'Environment',
      })}
      onChange={(changeValue) =>
        updateEnvironmentUrl(history, location, changeValue as string)
      }
      defaultValue={getEnvironmentLabel(environment)}
      field={SERVICE_ENVIRONMENT}
      start={start}
      end={end}
      data-test-subj="environmentFilter"
    />
  );
}

export function ServiceEnvironmentFilter({
  environment,
  start,
  end,
  termValue,
}: {
  environment: Environment;
  start?: string;
  end?: string;
  termValue: string;
}) {
  const history = useHistory();
  const location = useLocation();

  return (
    <SuggestionsSelectWithTerm
      allOption={ENVIRONMENT_ALL}
      placeholder={i18n.translate('xpack.apm.filter.environment.placeholder', {
        defaultMessage: 'Select environment',
      })}
      prepend={i18n.translate('xpack.apm.filter.environment.label', {
        defaultMessage: 'Environment',
      })}
      onChange={(changeValue) =>
        updateEnvironmentUrl(history, location, changeValue as string)
      }
      defaultValue={getEnvironmentLabel(environment)}
      field={SERVICE_ENVIRONMENT}
      termField={SERVICE_NAME}
      termValue={termValue}
      start={start}
      end={end}
      data-test-subj="environmentFilter"
    />
  );
}
