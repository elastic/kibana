/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { syntheticsMonitorDetailLocatorID } from '@kbn/observability-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useKibanaSpace } from '../../../hooks/use_kibana_space';
import { ClientPluginsStart } from '../../../plugin';

export function useMonitorDetailLocator({
  configId,
  locationId,
  spaceId,
}: {
  configId: string;
  locationId?: string;
  spaceId?: string;
}) {
  const { space } = useKibanaSpace();
  const [monitorUrl, setMonitorUrl] = useState<string | undefined>(undefined);
  const locator = useKibana<ClientPluginsStart>().services?.share?.url.locators.get(
    syntheticsMonitorDetailLocatorID
  );

  useEffect(() => {
    async function generateUrl() {
      const url = await locator?.getUrl({
        configId,
        locationId,
        ...(spaceId && spaceId !== space?.id ? { spaceId } : {}),
      });
      setMonitorUrl(url);
    }
    generateUrl();
  }, [locator, configId, locationId, spaceId, space?.id]);

  return monitorUrl;
}
