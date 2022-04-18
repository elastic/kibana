/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useMlHref } from '@kbn/ml-plugin/public';
import { Anomaly } from '../types';
import { useKibana } from '../../../lib/kibana';

interface ExplorerLinkProps {
  score: Anomaly;
  startDate: string;
  endDate: string;
  linkName: React.ReactNode;
}

export const ExplorerLink: React.FC<ExplorerLinkProps> = ({
  score,
  startDate,
  endDate,
  linkName,
}) => {
  const {
    services: { ml, http },
  } = useKibana();

  const explorerUrl = useMlHref(ml, http.basePath.get(), {
    page: 'explorer',
    pageState: {
      jobIds: [score.jobId],
      timeRange: {
        from: new Date(startDate).toISOString(),
        to: new Date(endDate).toISOString(),
        mode: 'absolute',
      },
      refreshInterval: {
        pause: true,
        value: 0,
        display: 'Off',
      },
    },
  });

  if (!explorerUrl) return null;

  return (
    <EuiLink href={explorerUrl} target="_blank">
      {linkName}
    </EuiLink>
  );
};
