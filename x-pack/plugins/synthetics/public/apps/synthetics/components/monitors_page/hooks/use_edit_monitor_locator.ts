/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { syntheticsEditMonitorLocatorID } from '@kbn/observability-plugin/common';
import { useSyntheticsStartPlugins } from '../../../contexts';

export function useEditMonitorLocator({ monitorId }: { monitorId: string }) {
  const [editUrl, setEditUrl] = useState<string | undefined>(undefined);
  const locator = useSyntheticsStartPlugins()?.share?.url.locators.get(
    syntheticsEditMonitorLocatorID
  );

  useEffect(() => {
    async function generateUrl() {
      const url = await locator?.getUrl({
        monitorId,
      });
      setEditUrl(url);
    }
    generateUrl();
  }, [locator, monitorId]);

  return editUrl;
}
