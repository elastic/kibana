/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiLink } from '@elastic/eui';
import { Tooltip } from 'plugins/monitoring/components/tooltip';

export const SourceTooltip = ({ isCopiedFromPrimary, sourceTransportAddress, children }) => {
  if (!sourceTransportAddress) {
    return children;
  }

  const tipText = (
    <Fragment>
      {sourceTransportAddress}
      <br />
      Copied from { isCopiedFromPrimary ? 'primary' : 'replica' } shard
    </Fragment>
  );

  return (
    <Tooltip text={tipText} placement="bottom" trigger="hover">
      <EuiLink>{children}</EuiLink>
    </Tooltip>
  );
};
