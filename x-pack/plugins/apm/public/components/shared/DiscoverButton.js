/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { KibanaLink } from '../../utils/url';
import { EuiButton } from '@elastic/eui';

function DiscoverButton({ query, children, ...rest }) {
  return (
    <KibanaLink
      pathname={'/app/kibana'}
      hash={'/discover'}
      query={query}
      {...rest}
    >
      <EuiButton iconType="discoverApp">
        {children || 'View in Discover'}
      </EuiButton>
    </KibanaLink>
  );
}

export default DiscoverButton;
