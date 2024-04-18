/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AlertConsumers, ValidFeatureId } from '@kbn/rule-data-utils';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TriggersAndActionsUiServices } from '../..';
import { fetchAlertIndexNames } from '../lib/rule_api/alert_index';
import { fetchAlertFields } from '../lib/rule_api/alert_fields';

export interface UserAlertDataViews {
  dataViews?: DataView[];
  loading: boolean;
}

export function useAlertDataViews(featureIds: ValidFeatureId[]): UserAlertDataViews {
  const {
    http,
    data: dataService,
    notifications: { toasts },
  } = useKibana<TriggersAndActionsUiServices>().services;
  const [dataViews, setDataViews] = useState<DataView[] | undefined>(undefined);
  const features = featureIds.sort().join(',');
  const isOnlySecurity = featureIds.length === 1 && featureIds.includes(AlertConsumers.SIEM);

  const hasSecurityAndO11yFeatureIds =
    featureIds.length > 1 && featureIds.includes(AlertConsumers.SIEM);

  const hasNoSecuritySolution =
    featureIds.length > 0 && !isOnlySecurity && !hasSecurityAndO11yFeatureIds;

  const queryIndexNameFn = () => {
    return fetchAlertIndexNames({ http, features });
  };

  const queryAlertFieldsFn = () => {
    return fetchAlertFields({ http, featureIds });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.useAlertDataView.useAlertDataMessage', {
        defaultMessage: 'Unable to load alert data view',
      })
    );
  };

  const {
    data: indexNames,
    isSuccess: isIndexNameSuccess,
    isInitialLoading: isIndexNameInitialLoading,
    isLoading: isIndexNameLoading,
  } = useQuery({
    queryKey: ['loadAlertIndexNames', features],
    queryFn: queryIndexNameFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    enabled: featureIds.length > 0 && !hasSecurityAndO11yFeatureIds,
  });

  const {
    data: alertFields,
    isSuccess: isAlertFieldsSuccess,
    isInitialLoading: isAlertFieldsInitialLoading,
    isLoading: isAlertFieldsLoading,
  } = useQuery({
    queryKey: ['loadAlertFields', features],
    queryFn: queryAlertFieldsFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    enabled: hasNoSecuritySolution,
  });

  useEffect(() => {
    return () => {
      dataViews?.map((dv) => {
        dataService.dataViews.clearInstanceCache(dv.id);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViews]);

  // FUTURE ENGINEER this useEffect is for security solution user since
  // we are using the user privilege to access the security alert index
  useEffect(() => {
    async function createDataView() {
      const localDataview = await dataService.dataViews.create({
        title: (indexNames ?? []).join(','),
        allowNoIndex: true,
      });
      setDataViews([localDataview]);
    }

    if (isOnlySecurity && isIndexNameSuccess) {
      createDataView();
    }
  }, [dataService.dataViews, indexNames, isIndexNameSuccess, isOnlySecurity]);

  // FUTURE ENGINEER this useEffect is for o11y and stack solution user since
  // we are using the kibana user privilege to access the alert index
  useEffect(() => {
    if (
      indexNames &&
      alertFields &&
      !isOnlySecurity &&
      isAlertFieldsSuccess &&
      isIndexNameSuccess
    ) {
      setDataViews([
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
    isIndexNameSuccess,
    isOnlySecurity,
    isAlertFieldsSuccess,
  ]);

  return useMemo(
    () => ({
      dataViews,
      loading:
        featureIds.length === 0 || hasSecurityAndO11yFeatureIds
          ? false
          : isOnlySecurity
          ? isIndexNameInitialLoading || isIndexNameLoading
          : isIndexNameInitialLoading ||
            isIndexNameLoading ||
            isAlertFieldsInitialLoading ||
            isAlertFieldsLoading,
    }),
    [
      dataViews,
      featureIds.length,
      hasSecurityAndO11yFeatureIds,
      isOnlySecurity,
      isIndexNameInitialLoading,
      isIndexNameLoading,
      isAlertFieldsInitialLoading,
      isAlertFieldsLoading,
    ]
  );
}
