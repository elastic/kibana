/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../lib/kibana';
import { getSecurityTagId, createSecurityTag } from './utils';

type UseCreateDashboard = () => { isLoading: boolean; url: string };

export const useCreateSecurityDashboardLink: UseCreateDashboard = () => {
  const {
    dashboard: { locator } = {},
    savedObjects: { client: savedObjectsClient },
    savedObjectsTagging,
  } = useKibana().services;

  const [securityTagId, setSecurityTagId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const getOrCreateSecurityTag = async () => {
      if (savedObjectsClient && savedObjectsTagging) {
        let tagId = await getSecurityTagId(savedObjectsClient);
        if (!tagId) {
          const newTag = await createSecurityTag(savedObjectsTagging.client);
          tagId = newTag.id;
        }
        if (!ignore) {
          setSecurityTagId(tagId);
        }
      }
    };

    getOrCreateSecurityTag();

    return () => {
      ignore = true;
    };
  }, [savedObjectsClient, savedObjectsTagging]);

  const result = useMemo(
    () => ({
      isLoading: securityTagId == null,
      url: securityTagId ? locator?.getRedirectUrl({ tags: [securityTagId] }) ?? '' : '',
    }),
    [securityTagId, locator]
  );

  return result;
};
