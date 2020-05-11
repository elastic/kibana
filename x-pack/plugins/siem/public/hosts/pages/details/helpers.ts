/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { escapeQueryValue } from '../../../lib/keury';
import { Filter } from '../../../../../../../src/plugins/data/public';

/** Returns the kqlQueryExpression for the `Events` widget on the `Host Details` page */
export const getHostDetailsEventsKqlQueryExpression = ({
  filterQueryExpression,
  hostName,
}: {
  filterQueryExpression: string;
  hostName: string;
}): string => {
  if (filterQueryExpression.length) {
    return `${filterQueryExpression}${
      hostName.length ? ` and host.name: ${escapeQueryValue(hostName)}` : ''
    }`;
  } else {
    return hostName.length ? `host.name: ${escapeQueryValue(hostName)}` : '';
  }
};

export const getHostDetailsPageFilters = (hostName: string): Filter[] => [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'host.name',
      value: hostName,
      params: {
        query: hostName,
      },
    },
    query: {
      match: {
        'host.name': {
          query: hostName,
          type: 'phrase',
        },
      },
    },
  },
];
