/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useUiTracker, useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../../utils/kibana_react';

const CAPABILITIES_KEYS = ['logs', 'infrastructure', 'apm', 'uptime'];

export const useOverviewMetrics = ({ hasAnyData }: { hasAnyData: boolean | undefined }) => {
  const {
    application: { capabilities },
  } = useKibana().services;

  const trackMetric = useUiTracker({ app: 'observability-overview' });

  useTrackPageview({ app: 'observability-overview', path: 'overview' });
  useTrackPageview({ app: 'observability-overview', path: 'overview', delay: 15000 });

  useEffect(() => {
    if (hasAnyData !== true) {
      return;
    }

    CAPABILITIES_KEYS.forEach((feature) => {
      const name = feature === 'infrastructure' ? 'metrics' : feature;

      // Track metric if the feature has been disabled, either because it
      // is missing or has show === false (manual disabling may not be
      // possible in all versions of Kibana)
      if (!capabilities[feature] || capabilities[feature]?.show === false) {
        trackMetric({
          metric: `oblt_disabled_feature_${name}`,
        });
      }

      // Track a separate metric if the feature is missing from the capabilities
      // (This usually means the plugin was auto-disabled by Kibana)
      if (!capabilities[feature]) {
        trackMetric({
          metric: `oblt_missing_feature_${name}`,
        });
      }
    });
  }, [capabilities, hasAnyData, trackMetric]);

  return {
    trackMetric,
  };
};
