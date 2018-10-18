/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore
import { legacyEncodeURIComponent, RelativeLink } from '../../utils/url';

interface Props {
  name: string;
  serviceName?: string;
  transactionType?: string;
  transactionId?: string;
  traceId?: string;
}

export const TraceLink: React.SFC<Props> = ({
  name,
  serviceName,
  transactionType,
  transactionId,
  traceId,
  children
}) => {
  if (!serviceName || !transactionType) {
    return <React.Fragment>{children}</React.Fragment>;
  }

  return (
    <RelativeLink
      path={`/${serviceName}/transactions/${transactionType}/${legacyEncodeURIComponent(
        name
      )}`}
      query={{ transactionId, traceId }}
    >
      {children}
    </RelativeLink>
  );
};
