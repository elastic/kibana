/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stringify } from 'querystring';
import { ENVIRONMENT_ALL } from '../../environment_filter_values';

const format = ({
  pathname,
  query,
}: {
  pathname: string;
  query: Record<string, any>;
}): string => {
  return `${pathname}?${stringify(query)}`;
};

export const getAlertUrl = (
  serviceNameField: string,
  serviceEnvField: string[]
) =>
  format({
    pathname: `/app/apm/services/${String(serviceNameField)}/errors`,
    query: {
      ...(serviceNameField?.[0]
        ? { environment: String(serviceEnvField[0]) }
        : { environment: ENVIRONMENT_ALL.value }),
    },
  });
