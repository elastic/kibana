/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { getTimepickerRisonData } from '../rison_helpers';
import { useMlHref, ML_PAGES } from '../../../../../../ml/public';

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
  const location = useLocation();

  const {
    core,
    plugins: { ml },
  } = useApmPluginContext();

  let jobIds: string[] = [];
  if (query.ml?.jobIds) {
    jobIds = query.ml.jobIds;
  }
  const { time, refreshInterval } = getTimepickerRisonData(location.search);

  // default to link to ML Anomaly Detection jobs management page
  const mlADLink = useMlHref(ml, core.http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      jobId: jobIds,
      groupIds: ['apm'],
      globalState: {
        time,
        refreshInterval,
      },
    },
  });

  return (
    <EuiLink
      children={children}
      href={mlADLink}
      external={external}
      target={external ? '_blank' : undefined}
    />
  );
}
