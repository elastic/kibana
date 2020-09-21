/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { getTimepickerRisonData } from '../rison_helpers';

interface MlRisonData {
  ml?: {
    jobIds: string[];
  };
}

interface Props {
  query?: MlRisonData;
  path?: string;
  children?: React.ReactNode;
  external?: boolean;
}

export function MLLink({ children, path = '', query = {}, external }: Props) {
  const { core } = useApmPluginContext();
  const location = useLocation();

  const {
    plugins: { ml },
  } = useApmPluginContext();

  // default to link to ML Anomaly Detection jobs management page
  const [mlADLink, setMlADLink] = useState(
    core.http.basePath.prepend('/app/ml/jobs')
  );

  useEffect(() => {
    let isCancelled = false;
    const generateLink = async () => {
      const { time, refreshInterval } = getTimepickerRisonData(location.search);
      let jobIds: string[] = [];
      if (query.ml?.jobIds) {
        jobIds = query.ml.jobIds;
      }

      if (ml?.urlGenerator !== undefined) {
        const href = await ml.urlGenerator.createUrl({
          page: 'jobs',
          pageState: {
            jobId: jobIds,
            timeRange: time,
            refreshInterval,
          },
        });
        if (!isCancelled) {
          setMlADLink(href);
        }
      }
    };
    generateLink();
    return () => {
      isCancelled = true;
    };
  }, [ml?.urlGenerator, location.search, query]);

  return (
    <EuiLink
      children={children}
      href={mlADLink}
      external={external}
      target={external ? '_blank' : undefined}
    />
  );
}
