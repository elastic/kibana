/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import { sendPostLogstashApiKeys, useStartServices } from '../../../../hooks';

export function useLogstashApiKey() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string>();
  const { notifications } = useStartServices();

  const generateApiKey = useCallback(async () => {
    try {
      setIsLoading(true);

      const res = await sendPostLogstashApiKeys();
      if (res.error) {
        throw res.error;
      }

      setApiKey(res.data?.api_key);
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.settings.logstashInstructions.generateApiKeyError', {
          defaultMessage: 'Impossible to generate an api key',
        }),
      });
    } finally {
      setIsLoading(false);
    }
  }, [notifications.toasts]);

  return useMemo(
    () => ({
      isLoading,
      generateApiKey,
      apiKey,
    }),
    [isLoading, generateApiKey, apiKey]
  );
}
