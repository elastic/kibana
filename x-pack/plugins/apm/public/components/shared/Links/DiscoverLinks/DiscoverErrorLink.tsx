/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  ERROR_GROUP_ID,
  SERVICE_NAME
} from 'x-pack/plugins/apm/common/constants';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/Error';
import { DiscoverLink } from './DiscoverLink';

function getDiscoverQuery(error: APMError, kuery?: string) {
  const serviceName = error.context.service.name;
  const groupId = error.error.grouping_key;
  let query = `${SERVICE_NAME}:"${serviceName}" AND ${ERROR_GROUP_ID}:"${groupId}"`;
  if (kuery) {
    query += ` AND ${kuery}`;
  }

  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query
      },
      sort: { '@timestamp': 'desc' }
    }
  };
}

const DiscoverErrorLink: React.SFC<{
  readonly error: APMError;
  readonly kuery?: string;
}> = ({ error, kuery, children }) => {
  return (
    <DiscoverLink query={getDiscoverQuery(error, kuery)} children={children} />
  );
};

export { DiscoverErrorLink };
