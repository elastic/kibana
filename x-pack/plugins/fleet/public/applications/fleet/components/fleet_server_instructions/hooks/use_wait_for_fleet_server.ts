/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useEffect, useState } from 'react';

import { sendGetFleetStatus, useStartServices } from '../../../hooks';

const REFRESH_INTERVAL = 10000;

/**
 * Polls the Fleet status endpoint until the `fleet_server` requirement does not appear
 * in the `missing_requirements` list.
 */
export const useWaitForFleetServer = () => {
  const [isFleetServerReady, setIsFleetServerReady] = useState(false);
  const { notifications } = useStartServices();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (!isFleetServerReady) {
      interval = setInterval(async () => {
        try {
          const res = await sendGetFleetStatus();

          if (res.error) {
            throw res.error;
          }
          if (res.data?.isReady && !res.data?.missing_requirements?.includes('fleet_server')) {
            setIsFleetServerReady(true);

            if (interval) {
              clearInterval(interval);
            }
          }
        } catch (err) {
          notifications.toasts.addError(err, {
            title: i18n.translate('xpack.fleet.fleetServerSetup.errorRefreshingFleetServerStatus', {
              defaultMessage: 'Error refreshing Fleet Server status',
            }),
          });
        }
      }, REFRESH_INTERVAL);
    }

    const cleanup = () => {
      if (interval) {
        clearInterval(interval);
      }
    };

    return cleanup;
  }, [notifications.toasts, isFleetServerReady]);

  return { isFleetServerReady };
};
