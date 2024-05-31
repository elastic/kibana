/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import {
  AllDatasetsLocatorParams,
  ALL_DATASETS_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { useHasData } from '../../hooks/use_has_data';
import { useKibana } from '../../utils/kibana_react';

export function LandingPage() {
  const { hasDataMap, isAllRequestsComplete } = useHasData();
  const {
    application: { navigateToUrl, navigateToApp },
    http: { basePath },
    share: { url },
  } = useKibana().services;

  useEffect(() => {
    if (isAllRequestsComplete) {
      const { apm, infra_logs: logs } = hasDataMap;
      const hasApmData = apm?.hasData;
      const hasLogsData = logs?.hasData;

      if (hasLogsData) {
        const allDataSetsLocator =
          url.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID);

        allDataSetsLocator?.navigate({});
      } else if (hasApmData) {
        navigateToUrl(basePath.prepend('/app/apm/services'));
      } else {
        navigateToUrl(basePath.prepend('/app/observabilityOnboarding'));
      }
    }
  }, [basePath, hasDataMap, isAllRequestsComplete, navigateToApp, navigateToUrl, url.locators]);

  return <></>;
}
