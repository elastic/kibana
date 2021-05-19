/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { Query } from 'src/plugins/data/public';
import { useAppToasts } from './use_app_toasts';

/**
 * Adds a toast error message whenever invalid KQL is submitted through the search bar
 */
export const useInvalidFilterQuery = ({
  filterQuery,
  kqlError,
  query,
  startDate,
  endDate,
}: {
  filterQuery?: string;
  kqlError?: Error;
  query: Query;
  startDate: string;
  endDate: string;
}) => {
  const { addError } = useAppToasts();

  useEffect(() => {
    if (filterQuery === undefined && kqlError != null) {
      // Removes error stack from user view
      delete kqlError.stack;
      addError(kqlError, { title: kqlError.name });
    }
    // This disable is required to only trigger the toast once per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterQuery, addError, query, startDate, endDate]);
};
