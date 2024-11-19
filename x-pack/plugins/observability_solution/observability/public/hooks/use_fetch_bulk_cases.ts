/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Cases } from '@kbn/cases-plugin/common';
import { useEffect, useState } from 'react';
import { useKibana } from '../utils/kibana_react';

export const useFetchBulkCases = ({
  ids = [],
}: {
  ids: string[];
}): { cases: Cases; isLoading: boolean; error?: Record<string, any> } => {
  const [cases, setCases] = useState<Cases>([]);
  const [error, setError] = useState();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { cases: casesService } = useKibana().services;

  useEffect(() => {
    const getBulkCasesByIds = async () => {
      return casesService.api.cases.bulkGet({ ids });
    };
    if (ids.length) {
      setIsLoading(true);
      getBulkCasesByIds()
        .then((res) => setCases(res.cases))
        .catch((resError) => setError(resError))
        .finally(() => setIsLoading(false));
    }
  }, [casesService.api.cases, ids]);

  return { cases, isLoading, error };
};
