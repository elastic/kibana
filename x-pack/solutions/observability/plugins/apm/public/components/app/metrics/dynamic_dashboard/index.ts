/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PanelBuilder } from '../metrics_dashboard/types';
import { getPanelBuilder } from './dashboard_catalog';
import { getDashboardDimensions } from './get_dashboard_dimensions';

interface ResolvePanelBuilderProps {
  agentName?: string;
  telemetrySdkName?: string;
  telemetrySdkLanguage?: string;
  runtimeVersion?: string;
}

export const resolvePanelBuilder = ({
  agentName,
  telemetrySdkName,
  telemetrySdkLanguage,
  runtimeVersion,
}: ResolvePanelBuilderProps): PanelBuilder | undefined => {
  if (!agentName) {
    return undefined;
  }

  const dimensions = getDashboardDimensions({
    agentName,
    telemetrySdkName,
    telemetrySdkLanguage,
    runtimeVersion,
  });

  if (!dimensions) {
    return undefined;
  }

  return getPanelBuilder(
    dimensions.dataFormat,
    dimensions.sdkName,
    dimensions.language,
    dimensions.version
  );
};
