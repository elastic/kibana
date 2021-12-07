/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
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

export const useStackByFields = () => {
  const [stackByFieldOptions, setStackByFieldOptions] = useState<
    undefined | EuiComboBoxOptionOption[]
  >(undefined);
  const { pathname } = useLocation();

  const { browserFields } = useSourcererDataView(getScopeFromPath(pathname));
  const allFields = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);
  useEffect(() => {
    const options = Object.entries(allFields).reduce<EuiComboBoxOptionOption[]>(
      (filteredOptions: EuiComboBoxOptionOption[], [key, field]) => {
        if (field.aggregatable === true) {
          return [...filteredOptions, { label: key, value: key }];
        } else {
          return filteredOptions;
        }
      },
      []
    );
    setStackByFieldOptions(options);
  }, [allFields]);
  return useMemo(() => stackByFieldOptions, [stackByFieldOptions]);
};
