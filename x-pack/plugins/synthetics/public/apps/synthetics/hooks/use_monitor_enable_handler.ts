/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { useState } from 'react';
import { ConfigKey, EncryptedSyntheticsMonitor } from '../components/monitors_page/overview/types';
import { fetchUpsertMonitor } from '../state';

export function useMonitorEnableHandler({
  id,
  monitor,
}: {
  id: string;
  monitor: EncryptedSyntheticsMonitor;
}) {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const { status } = useFetcher(() => {
    if (isEnabled !== null) {
      return fetchUpsertMonitor({ id, monitor: { ...monitor, [ConfigKey.ENABLED]: isEnabled } });
    }
  }, [isEnabled]);

  return { isEnabled, setIsEnabled, status };
}
