/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useKibana } from './use_kibana';

export function useAssetLocators() {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  return useMemo(() => {
    return {
      dashboardLocator: share.url.locators.get(DASHBOARD_APP_LOCATOR),
    };
  }, [share.url.locators]);
}
