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
import { DiscoverButton } from './DiscoverButton';

function getDiscoverQuery(serviceName: string, groupId: string, kuery: string) {
  let query = `${SERVICE_NAME}:"${serviceName}" AND ${ERROR_GROUP_ID}:"${groupId}"`;
  if (kuery) {
    query = ` AND ${kuery}`;
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

export const DiscoverErrorButton: React.SFC<{
  readonly serviceName: string;
  readonly groupId: string;
  readonly kuery: string;
}> = ({ serviceName, groupId, kuery, children }) => {
  return (
    <DiscoverButton
      query={getDiscoverQuery(serviceName, groupId, kuery)}
      children={children}
    />
  );
};
