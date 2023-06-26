/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useHasData } from '../../hooks/use_has_data';
import { useKibana } from '../../utils/kibana_react';

export function LandingPage() {
  const { hasDataMap, isAllRequestsComplete } = useHasData();
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  if (isAllRequestsComplete) {
    const { apm, infra_logs: logs } = hasDataMap;
    const hasApmData = apm?.hasData;
    const hasLogsData = logs?.hasData;

    if (hasLogsData) {
      navigateToUrl(basePath.prepend('/app/discover'));
    } else if (hasApmData) {
      navigateToUrl(basePath.prepend('/app/apm/services'));
    } else {
      navigateToUrl(basePath.prepend('/app/observabilityOnboarding'));
    }
  }
  return <></>;
}
