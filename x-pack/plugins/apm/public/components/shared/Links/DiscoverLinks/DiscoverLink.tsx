/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import { KibanaRisonLink } from '../KibanaRisonLink';
import { QueryWithIndexPattern } from './QueryWithIndexPattern';

interface Props {
  query: StringMap<any>;
  children: React.ReactNode;
}

export function DiscoverLink({ query, ...rest }: Props) {
  return (
    <QueryWithIndexPattern query={query}>
      {queryWithIndexPattern => (
        <KibanaRisonLink
          pathname={'/app/kibana'}
          hash={'/discover'}
          query={queryWithIndexPattern}
          {...rest}
        />
      )}
    </QueryWithIndexPattern>
  );
}
