/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '../../../../private/var/tmp/_bazel_stephmilovic/f2692a3f20a774c59f0da1de1e889609/execroot/kibana/bazel-out/darwin_arm64-fastbuild/bin/packages/kbn-es-query';
import { escapeQueryValue } from '../../../../common/lib/kuery';

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
