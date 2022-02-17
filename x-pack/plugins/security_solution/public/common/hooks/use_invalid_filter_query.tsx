/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { Query } from '@kbn/es-query';
import { appSelectors } from '../store';
import { appActions } from '../store/app';
import { useAppToasts } from './use_app_toasts';
import { useDeepEqualSelector } from './use_selector';

/**
 * Adds a toast error message whenever invalid KQL is submitted through the search bar
 */
export const useInvalidFilterQuery = ({
  id,
  filterQuery,
  kqlError,
  query,
  startDate,
  endDate,
}: {
  id: string;
  filterQuery?: string;
  kqlError?: Error;
  query: Query;
  startDate: string;
  endDate: string;
}) => {
  const { addError } = useAppToasts();
  const dispatch = useDispatch();
  const getErrorsSelector = useMemo(() => appSelectors.errorsSelector(), []);
  const errors = useDeepEqualSelector(getErrorsSelector);

  useEffect(() => {
    if (filterQuery === undefined && kqlError != null) {
      // Local util for creating an replicatable error hash
      const hashCode = kqlError.message
        .split('')
        // eslint-disable-next-line no-bitwise
        .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
        .toString();
      dispatch(
        appActions.addErrorHash({
          id,
          hash: hashCode,
          title: kqlError.name,
          message: [kqlError.message],
        })
      );
    }
    // This disable is required to only trigger the toast once per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filterQuery, addError, query, startDate, endDate]);

  useEffect(() => {
    const myError = errors.find((e) => e.id === id);
    if (myError != null && myError.displayError && kqlError != null) {
      // Removes error stack from user view
      delete kqlError.stack; // Mutates the error object and can possibly lead to side effects, only going this route for type issues. Change when we add a stackless toast error
      addError(kqlError, { title: kqlError.name });
    }
  }, [addError, errors, id, kqlError]);
};
