/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import * as i18n from '../translations';

const ECS_VERSION_ENDPOINT = 'https://raw.githubusercontent.com/elastic/ecs/main/version';

interface UseEcsVersion {
  error: string | null;
  loading: boolean;
  version: string | null;
}

export const useEcsVersion = (): UseEcsVersion => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(ECS_VERSION_ENDPOINT);

        if (response.ok) {
          const ecsVersion = await response.text();

          setVersion(ecsVersion);
        } else {
          throw new Error(response.statusText);
        }
      } catch (e) {
        setError(i18n.ERROR_LOADING_ECS_VERSION(e));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [setError]);

  return { error, loading, version };
};
