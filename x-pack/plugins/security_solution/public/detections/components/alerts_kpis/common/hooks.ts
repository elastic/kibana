/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { BrowserField } from '../../../../../../timelines/common';
import type { GlobalTimeArgs } from '../../../../common/containers/use_global_time';
import { getScopeFromPath, useSourcererDataView } from '../../../../common/containers/sourcerer';
import { getAllFieldsByName } from '../../../../common/containers/source';

export interface UseInspectButtonParams extends Pick<GlobalTimeArgs, 'setQuery' | 'deleteQuery'> {
  response: string;
  request: string;
  refetch: (() => void) | null;
  uniqueQueryId: string;
  loading: boolean;
}

/**
 * * Add query to inspect button utility.
 * * Delete query from inspect button utility when component unmounts
 */
export const useInspectButton = ({
  setQuery,
  response,
  request,
  refetch,
  uniqueQueryId,
  deleteQuery,
  loading,
}: UseInspectButtonParams) => {
  useEffect(() => {
    if (refetch != null && setQuery != null) {
      setQuery({
        id: uniqueQueryId,
        inspect: {
          dsl: [request],
          response: [response],
        },
        loading,
        refetch,
      });
    }

    return () => {
      if (deleteQuery) {
        deleteQuery({ id: uniqueQueryId });
      }
    };
  }, [setQuery, loading, response, request, refetch, uniqueQueryId, deleteQuery]);
};

export function getAggregatableFields(fields: {
  [fieldName: string]: Partial<BrowserField>;
}): EuiComboBoxOptionOption[] {
  const result = [];
  for (const [key, field] of Object.entries(fields)) {
    if (field.aggregatable === true) {
      result.push({ label: key, value: key });
    }
  }
  return result;
}

export const useStackByFields = () => {
  const { pathname } = useLocation();

  const { browserFields } = useSourcererDataView(getScopeFromPath(pathname));
  const allFields = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);
  const [stackByFieldOptions, setStackByFieldOptions] = useState(() =>
    getAggregatableFields(allFields)
  );
  useEffect(() => {
    setStackByFieldOptions(getAggregatableFields(allFields));
  }, [allFields]);
  return useMemo(() => stackByFieldOptions, [stackByFieldOptions]);
};
