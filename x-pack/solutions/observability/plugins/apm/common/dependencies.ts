/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ATTR_PROCESSOR_EVENT,
  ATTR_SPAN_DESTINATION_SERVICE_RESOURCE,
  PROCESSOR_EVENT_VALUE_METRIC,
} from '@kbn/observability-ui-semantic-conventions';
import { environmentQuery } from './utils/environment_query';

export const unifiedSearchBarPlaceholder = i18n.translate(
  'xpack.apm.dependencies.unifiedSearchBarPlaceholder',
  {
    defaultMessage: `Search dependency metrics (e.g. span.destination.service.resource:elasticsearch)`,
  }
);

export const getSearchBarBoolFilter = ({
  dependencyName,
  environment,
}: {
  dependencyName?: string;
  environment: string;
}) => {
  return [
    { term: { [ATTR_PROCESSOR_EVENT]: PROCESSOR_EVENT_VALUE_METRIC } },
    { exists: { field: ATTR_SPAN_DESTINATION_SERVICE_RESOURCE } },
    ...(dependencyName
      ? [{ term: { [ATTR_SPAN_DESTINATION_SERVICE_RESOURCE]: dependencyName } }]
      : []),
    ...environmentQuery(environment),
  ];
};
