/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import { KibanaLink } from '../../../utils/url';
import { QueryWithIndexPattern } from './QueryWithIndexPattern';

interface Props {
  query: StringMap;
}

export class DiscoverButton extends React.Component<Props> {
  public render() {
    const { query, children, ...rest } = this.props;
    return (
      <QueryWithIndexPattern query={query}>
        {queryWithIndexPattern => (
          <KibanaLink
            pathname={'/app/kibana'}
            hash={'/discover'}
            query={queryWithIndexPattern}
            children={children}
            {...rest}
          />
        )}
      </QueryWithIndexPattern>
    );
  }
}
