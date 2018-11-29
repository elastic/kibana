/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import { KibanaLink } from '../../../utils/url';

export const DiscoverButton: React.SFC<{
  query: StringMap;
}> = ({ query, children, ...rest }) => {
  return (
    <KibanaLink
      pathname={'/app/kibana'}
      hash={'/discover'}
      query={query}
      children={children}
      {...rest}
    />
  );
};
