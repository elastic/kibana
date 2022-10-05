/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import * as yaml from 'js-yaml';

import * as i18n from '../translations';
import type { EcsMetadata } from '../types';

const ECS_METADATA_ENDPOINT =
  'https://raw.githubusercontent.com/elastic/ecs/main/generated/ecs/ecs_flat.yml';

interface UseEcsMetadata {
  ecsMetadata: Record<string, EcsMetadata> | null;
  error: string | null;
  loading: boolean;
}

export const useEcsMetadata = (): UseEcsMetadata => {
  const [ecsMetadata, setEcsMetadata] = useState<Record<string, EcsMetadata> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(ECS_METADATA_ENDPOINT);

        if (response.ok) {
          const metadataYaml = await response.text();

          setEcsMetadata(yaml.safeLoad(metadataYaml));
        } else {
          throw new Error(response.statusText);
        }
      } catch (e) {
        setError(i18n.ERROR_LOADING_ECS_METADATA(e));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [setError]);

  return { ecsMetadata, error, loading };
};
