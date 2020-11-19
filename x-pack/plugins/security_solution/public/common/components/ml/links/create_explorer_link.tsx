/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
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
  const urlGenerator = useKibana().services.ml?.urlGenerator;
  const [explorerUrl, setExplorerUrl] = useState('');

  useEffect(() => {
    let unmount = false;
    if (!urlGenerator) return;

    urlGenerator
      .createUrl({
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
      })
      .then((url) => {
        if (!unmount) {
          setExplorerUrl(url);
        }
      });

    return () => {
      unmount = true;
    };
  }, [urlGenerator, startDate, endDate, score]);

  if (!explorerUrl) return null;

  return (
    <EuiLink href={explorerUrl} target="_blank">
      {linkName}
    </EuiLink>
  );
};
