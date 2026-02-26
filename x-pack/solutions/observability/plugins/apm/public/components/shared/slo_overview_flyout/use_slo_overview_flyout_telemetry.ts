/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApmPluginStartDeps, ApmServices } from '../../../plugin';

export const useSloOverviewFlyoutTelemetry = () => {
  const { services } = useKibana<ApmPluginStartDeps & ApmServices>();
  const { telemetry } = services;

  return useMemo(
    () => ({
      reportSearchQueried: (searchQuery: string) =>
        telemetry.reportSloOverviewFlyoutSearchQueried({ searchQuery }),
      reportStatusFiltered: (statuses: string[]) =>
        telemetry.reportSloOverviewFlyoutStatusFiltered({ statuses }),
    }),
    [telemetry]
  );
};
