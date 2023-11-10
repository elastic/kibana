/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import { AlertConsumers, ValidFeatureId } from '@kbn/rule-data-utils';
import { useEffect, useMemo, useState } from 'react';
import { HttpSetup } from '@kbn/core/public';
import { useQuery } from '@tanstack/react-query';
import { TriggersAndActionsUiServices } from '../..';

export interface UserAlertDataView {
  dataview?: DataView[];
  loading: boolean;
}

async function fetchIndexNames({
  http,
  features,
}: {
  http: HttpSetup;
  features: string;
}): Promise<string[]> {
  const { index_name: indexNamesStr } = await http.get<{ index_name: string[] }>(
    `${BASE_RAC_ALERTS_API_PATH}/index`,
    {
      query: { features },
    }
  );
  return indexNamesStr;
}

async function fetchAlertFields({
  http,
  featureIds,
}: {
  http: HttpSetup;
  featureIds: ValidFeatureId[];
}): Promise<FieldSpec[]> {
  const { fields: alertFields } = await http.get<{ fields: FieldSpec[] }>(
    `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
    {
      query: { featureIds },
    }
  );
  return alertFields;
}

export function useAlertDataView(featureIds: ValidFeatureId[]): UserAlertDataView {
  const {
    http,
    data: dataService,
    notifications: { toasts },
  } = useKibana<TriggersAndActionsUiServices>().services;
  const [dataview, setDataview] = useState<DataView[] | undefined>(undefined);
  const features = featureIds.sort().join(',');
  const isOnlySecurity =
    featureIds.length === 1 && (featureIds as AlertConsumers[]).includes(AlertConsumers.SIEM);

  const queryIndexNameFn = () => {
    return fetchIndexNames({ http, features });
  };

  const queryAlertFieldsFn = () => {
    return fetchAlertFields({ http, featureIds });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.alertSearchBar.useAlertDataMessage', {
        defaultMessage: 'Unable to load alert data view',
      })
    );
  };

  const {
    data: indexNames,
    isSuccess: isIndexNameSuccess,
    isFetching: isIndexNameFetching,
    isInitialLoading: isIndexNameInitialLoading,
    isLoading: isIndexNameLoading,
  } = useQuery({
    queryKey: ['loadAlertIndexNames'],
    queryFn: queryIndexNameFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    enabled: featureIds.length > 0,
  });

  const {
    data: alertFields,
    isSuccess: isalertFieldsSuccess,
    isFetching: isalertFieldsFetching,
    isInitialLoading: isalertFieldsInitialLoading,
    isLoading: isalertFieldsLoading,
  } = useQuery({
    queryKey: ['loadAlertFields'],
    queryFn: queryAlertFieldsFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    enabled: !isOnlySecurity,
  });

  useEffect(() => {
    async function createDataView() {
      const localDataview = await dataService.dataViews.create({
        title: (indexNames ?? []).join(','),
        allowNoIndex: true,
      });
      setDataview([localDataview]);
    }

    if (isOnlySecurity && isIndexNameSuccess && !isIndexNameFetching) {
      createDataView();
    }
  }, [dataService.dataViews, indexNames, isIndexNameFetching, isIndexNameSuccess, isOnlySecurity]);

  useEffect(() => {
    if (
      !isOnlySecurity &&
      isalertFieldsSuccess &&
      isIndexNameSuccess &&
      !isIndexNameFetching &&
      !isalertFieldsFetching
    ) {
      setDataview([
        {
          title: (indexNames ?? []).join(','),
          fieldFormatMap: {},
          fields: (alertFields ?? [])?.map((field) => {
            return {
              ...field,
              ...(field.esTypes && field.esTypes.includes('flattened') ? { type: 'string' } : {}),
            };
          }),
        },
      ] as unknown as DataView[]);
    }
  }, [
    alertFields,
    dataService.dataViews,
    indexNames,
    isIndexNameFetching,
    isIndexNameSuccess,
    isOnlySecurity,
    isalertFieldsFetching,
    isalertFieldsSuccess,
  ]);

  return useMemo(
    () => ({
      dataview,
      loading: isOnlySecurity
        ? isIndexNameInitialLoading || isIndexNameLoading
        : isIndexNameInitialLoading ||
          isIndexNameLoading ||
          isalertFieldsInitialLoading ||
          isalertFieldsLoading,
    }),
    [
      dataview,
      isIndexNameInitialLoading,
      isIndexNameLoading,
      isOnlySecurity,
      isalertFieldsInitialLoading,
      isalertFieldsLoading,
    ]
  );
}
