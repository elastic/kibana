/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ProcessorEvent } from './processor_event';
import {
  PROCESSOR_EVENT,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from './elasticsearch_fieldnames';
import { environmentQuery } from './utils/environment_query';

export const kueryBarPlaceholder = i18n.translate(
  'xpack.apm.dependencies.kueryBarPlaceholder',
  {
    defaultMessage: `Search dependency metrics (e.g. span.destination.service.resource:elasticsearch)`,
  }
);

export const getKueryBarBoolFilter = ({
  backendName,
  environment,
}: {
  backendName?: string;
  environment: string;
}) => {
  return [
    { term: { [PROCESSOR_EVENT]: ProcessorEvent.metric } },
    { exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE } },
    ...(backendName
      ? [{ term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: backendName } }]
      : []),
    ...environmentQuery(environment),
  ];
};
