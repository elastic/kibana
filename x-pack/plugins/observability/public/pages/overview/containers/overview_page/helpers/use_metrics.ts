/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { useTrackPageview } from '../../../../..';
import { useUiTracker } from '../../../../../hooks/use_track_metric';
import { ObservabilityAppServices } from '../../../../../application/types';
import { CAPABILITIES_KEYS } from '../constants';

export const useOverviewMetrics = ({ hasAnyData }: { hasAnyData: boolean | undefined }) => {
  const {
    application: { capabilities },
  } = useKibana<ObservabilityAppServices>().services;

  const trackMetric = useUiTracker({ app: 'observability-overview' });

  useTrackPageview({ app: 'observability-overview', path: 'overview' });
  useTrackPageview({ app: 'observability-overview', path: 'overview', delay: 15000 });

  useEffect(() => {
    if (hasAnyData !== true) {
      return;
    }

    CAPABILITIES_KEYS.forEach((feature) => {
      if (capabilities[feature].show === false) {
        trackMetric({
          metric: `oblt_disabled_feature_${feature === 'infrastructure' ? 'metrics' : feature}`,
        });
      }
    });
  }, [capabilities, hasAnyData, trackMetric]);

  return {
    trackMetric,
  };
};
