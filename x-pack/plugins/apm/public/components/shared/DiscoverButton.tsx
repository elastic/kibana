/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import { KibanaLink } from '../../utils/url';

interface Props {
  query: StringMap;
  children: any;
}

export function DiscoverButton({ query, children, ...rest }: Props) {
  return (
    <KibanaLink
      pathname={'/app/kibana'}
      hash={'/discover'}
      query={query}
      {...rest}
    >
      <EuiButtonEmpty iconType="discoverApp">
        {children || 'View in Discover'}
      </EuiButtonEmpty>
    </KibanaLink>
  );
}
