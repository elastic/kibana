/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { syntheticsMonitorDetailLocatorID } from '@kbn/observability-plugin/common';
import { useSyntheticsStartPlugins } from '../../../contexts';

export function useMonitorDetailLocator({
  configId,
  locationId,
}: {
  configId: string;
  locationId?: string;
}) {
  const [monitorUrl, setMonitorUrl] = useState<string | undefined>(undefined);
  const locator = useSyntheticsStartPlugins()?.share?.url.locators.get(
    syntheticsMonitorDetailLocatorID
  );

  useEffect(() => {
    async function generateUrl() {
      const url = await locator?.getUrl({
        configId,
        locationId,
      });
      setMonitorUrl(url);
    }
    generateUrl();
  }, [locator, configId, locationId]);

  return monitorUrl;
}
