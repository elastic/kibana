/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../utils/kibana_react';

interface UseCreateDataViewProps {
  indexPatternString: string | undefined;
}

export function useCreateDataView({ indexPatternString }: UseCreateDataViewProps) {
  const { dataViews } = useKibana().services;

  const [stateDataView, setStateDataView] = useState<DataView | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const createDataView = () =>
      dataViews.create({
        id: `${indexPatternString}-id`,
        title: indexPatternString,
        allowNoIndex: true,
      });

    if (indexPatternString) {
      setIsLoading(true);
      createDataView()
        .then((value) => {
          setStateDataView(value);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [indexPatternString, dataViews]);

  return { dataView: stateDataView, loading: isLoading };
}
