/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useState } from 'react';

import type { RequestError } from '../../fleet/hooks';
import { sendGetCategories } from '../../fleet/hooks';
import type { GetCategoriesResponse } from '../types';

export function useCategories(prerelease?: boolean) {
  const [data, setData] = useState<GetCategoriesResponse | undefined>();
  const [error, setError] = useState<RequestError | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isPrereleaseEnabled, setIsPrereleaseEnabled] = useState(prerelease);

  const fetchData = useCallback(async () => {
    if (prerelease === undefined) {
      return;
    }
    if (isPrereleaseEnabled === prerelease) {
      return;
    }
    setIsPrereleaseEnabled(prerelease);
    setIsLoading(true);
    try {
      const res = await sendGetCategories({
        include_policy_templates: true,
        prerelease,
      });
      if (res.error) {
        throw res.error;
      }
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err);
    }
    setIsLoading(false);
  }, [prerelease, isPrereleaseEnabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    error,
    isLoading,
  };
}
