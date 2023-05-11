/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { BrowserField, BrowserFields } from '@kbn/rule-registry-plugin/common';
import type { DataViewFieldBase } from '@kbn/es-query';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
import { loadAlertDataView } from '../../../hooks/use_alert_data_view';
import type { Alerts } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { ERROR_FETCH_BROWSER_FIELDS } from './translations';
import { getCategory } from '../../field_browser/helpers';

export interface FetchAlertsArgs {
  featureIds: ValidFeatureId[];
  initialBrowserFields?: BrowserFields;
}

export interface FetchAlertResp {
  alerts: Alerts;
}

export type UseFetchAlerts = ({ featureIds }: FetchAlertsArgs) => [boolean, FetchAlertResp];

const INVALID_FEATURE_ID = 'siem';

/**
 * HOT Code path where the fields can be 16087 in length or larger. This is
 * VERY mutatious on purpose to improve the performance of the transform.
 */
const getDataViewStateFromIndexFields = (
  _title: string,
  fields: DataViewFieldBase[],
  _includeUnmapped: boolean = false
): BrowserFields => {
  // Adds two dangerous casts to allow for mutations within this function
  type DangerCastForMutation = Record<string, {}>;

  return fields.reduce<BrowserFields>((browserFields, field) => {
    // mutate browserFields
    const category = getCategory(field.name);
    if (browserFields[category] == null) {
      (browserFields as DangerCastForMutation)[category] = {};
    }
    if (browserFields[category].fields == null) {
      browserFields[category].fields = {};
    }
    (browserFields[category].fields as Record<string, BrowserField>)[field.name] =
      field as unknown as BrowserField;

    return browserFields;
  }, {});
};

export const useFetchBrowserFieldCapabilities = ({
  featureIds,
  initialBrowserFields,
}: FetchAlertsArgs): [boolean | undefined, BrowserFields] => {
  const {
    http,
    data: dataService,
    notifications: { toasts },
  } = useKibana().services;

  const enabled = !initialBrowserFields && !featureIds.includes(INVALID_FEATURE_ID);

  const { data: dataView, isFetching } = useQuery({
    queryKey: ['fetchBrowserFields', featureIds],
    queryFn: () => {
      return loadAlertDataView({ http, dataService, featureIds });
    },
    onError: () => {
      toasts.addDanger(ERROR_FETCH_BROWSER_FIELDS);
    },
    enabled,
    keepPreviousData: true,
    cacheTime: 0,
    refetchOnWindowFocus: false,
  });
  const loading = useRef<boolean | undefined>(isFetching);
  const browserFields = useMemo(() => {
    if (!enabled && initialBrowserFields) {
      loading.current = undefined;
      return initialBrowserFields;
    }
    if (!dataView) {
      loading.current = undefined;
      return {};
    }
    loading.current = isFetching;
    return getDataViewStateFromIndexFields(
      dataView.id ?? '',
      dataView.fields != null ? dataView.fields : []
    );
  }, [enabled, initialBrowserFields, dataView, isFetching]);

  return [loading.current, browserFields];
};
