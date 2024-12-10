/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import { useFetchDataViews } from '@kbn/observability-plugin/public';
import { useKibana } from '../../../../../hooks/use_kibana';

export const getDataViewPatternOrId = ({
  byId,
  byPattern,
  dataViewsList,
  adHocDataViews,
}: {
  byId?: string;
  byPattern?: string;
  dataViewsList: DataViewListItem[];
  adHocDataViews: DataView[];
}) => {
  const allDataViews = [
    ...(dataViewsList ?? []),
    ...adHocDataViews.map((dv) => ({ id: dv.id, title: dv.getIndexPattern() })),
  ];
  if (byId) {
    return allDataViews.find((dv) => dv.id === byId)?.title;
  }
  if (byPattern) {
    return allDataViews.find((dv) => dv.title === byPattern)?.id;
  }
};

export const useAdhocDataViews = ({ currentIndexPattern }: { currentIndexPattern: string }) => {
  const {
    isLoading: isDataViewsLoading,
    data: dataViewsList = [],
    refetch: refetchDataViewsList,
  } = useFetchDataViews();
  const { dataViews: dataViewsService } = useKibana().services;
  const [adHocDataViews, setAdHocDataViews] = useState<DataView[]>([]);

  useEffect(() => {
    if (!isDataViewsLoading) {
      const missingDataView = getDataViewPatternOrId({
        byPattern: currentIndexPattern,
        dataViewsList,
        adHocDataViews,
      });

      if (!missingDataView && currentIndexPattern) {
        async function loadMissingDataView() {
          const dataView = await dataViewsService.create(
            {
              title: currentIndexPattern,
              allowNoIndex: true,
            },
            true
          );
          if (dataView.getIndexPattern() === currentIndexPattern) {
            setAdHocDataViews((prev) => [...prev, dataView]);
          }
        }

        loadMissingDataView();
      }
    }
  }, [adHocDataViews, currentIndexPattern, dataViewsList, dataViewsService, isDataViewsLoading]);

  return {
    adHocDataViews,
    setAdHocDataViews,
    dataViewsList,
    isDataViewsLoading,
    refetchDataViewsList,
  };
};
