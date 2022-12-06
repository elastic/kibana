/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  PROCESSOR_EVENT,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from './es_fields/apm';
import { environmentQuery } from './utils/environment_query';

export const kueryBarPlaceholder = i18n.translate(
  'xpack.apm.dependencies.kueryBarPlaceholder',
  {
    defaultMessage: `Search dependency metrics (e.g. span.destination.service.resource:elasticsearch)`,
  }
);

export const getKueryBarBoolFilter = ({
  dependencyName,
  environment,
}: {
  dependencyName?: string;
  environment: string;
}) => {
  return [
    { term: { [PROCESSOR_EVENT]: ProcessorEvent.metric } },
    { exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE } },
    ...(dependencyName
      ? [{ term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencyName } }]
      : []),
    ...environmentQuery(environment),
  ];
};
