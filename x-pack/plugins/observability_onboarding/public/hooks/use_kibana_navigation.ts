/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityOnboardingAppServices } from '..';

export function useKibanaNavigation() {
  const {
    application: { navigateToUrl, navigateToApp },
    http: { basePath },
  } = useKibana<ObservabilityOnboardingAppServices>().services;

  const navigateToKibanaUrl = (kibanaPath: string) => {
    navigateToUrl(basePath.prepend(kibanaPath), {});
  };

  const navigateToAppUrl = (path: string) => {
    navigateToApp('', { path, openInNewTab: true });
  };

  return { navigateToKibanaUrl, navigateToAppUrl };
}
