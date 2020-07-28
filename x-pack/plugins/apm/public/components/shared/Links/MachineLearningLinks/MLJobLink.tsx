/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { EuiLink } from '@elastic/eui';
import { useTimeSeriesExplorerHref } from './useTimeSeriesExplorerHref';

interface Props {
  children?: ReactNode;
  jobId: string;
  external?: boolean;
  serviceName?: string;
  transactionType?: string;
}

export function MLJobLink({
  jobId,
  serviceName,
  transactionType,
  external,
  children,
}: Props) {
  const href = useTimeSeriesExplorerHref({
    jobId,
    serviceName,
    transactionType,
  });

  return (
    <EuiLink
      children={children}
      href={href}
      external={external}
      target={external ? '_blank' : undefined}
    />
  );
}
