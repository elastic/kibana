/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../lib/kibana';
import { getSecurityTagIds } from './utils';

type UseCreateDashboard = () => { isLoading: boolean; url: string };

export const useCreateSecurityDashboardLink: UseCreateDashboard = () => {
  const { dashboard: { locator } = {}, savedObjectsTagging, http } = useKibana().services;

  const [securityTagId, setSecurityTagId] = useState<string[] | null>(null);

  useEffect(() => {
    let ignore = false;
    const getOrCreateSecurityTag = async () => {
      if (http && savedObjectsTagging) {
        // getSecurityTagIds creates a tag if it coundn't find one
        const tagIds = await getSecurityTagIds(http);

        if (!ignore && tagIds) {
          setSecurityTagId(tagIds);
        }
      }
    };

    getOrCreateSecurityTag();

    return () => {
      ignore = true;
    };
  }, [http, savedObjectsTagging]);

  const result = useMemo(
    () => ({
      isLoading: securityTagId == null,
      url: securityTagId ? locator?.getRedirectUrl({ tags: [securityTagId[0]] }) ?? '' : '',
    }),
    [securityTagId, locator]
  );

  return result;
};
