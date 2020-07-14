/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useTimeSeriesExplorerHref } from './useTimeSeriesExplorerHref';

interface Props {
  jobId: string;
  external?: boolean;
  serviceName?: string;
  transactionType?: string;
}

export const MLJobLink: React.FC<Props> = ({
  jobId,
  serviceName,
  transactionType,
  external,
  children,
}) => {
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
};
