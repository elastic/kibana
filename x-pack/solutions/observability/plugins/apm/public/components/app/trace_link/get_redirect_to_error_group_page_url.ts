/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';

export const getRedirectToErrorGroupPageUrl = ({
  errorGroupId,
  rangeFrom,
  rangeTo,
  serviceName,
  kuery,
}: {
  errorGroupId: string;
  rangeFrom: string;
  rangeTo: string;
  serviceName: string;
  kuery?: string;
}) => {
  return format({
    pathname: `/services/${serviceName}/errors/${errorGroupId}`,
    query: {
      rangeFrom,
      rangeTo,
      kuery,
    },
  });
};
