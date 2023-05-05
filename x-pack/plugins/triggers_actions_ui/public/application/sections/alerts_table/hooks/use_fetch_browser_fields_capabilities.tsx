/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { BrowserField, BrowserFields } from '@kbn/rule-registry-plugin/common';
import type { DataViewFieldBase } from '@kbn/es-query';
import memoizeOne from 'memoize-one';
import { useEffect, useState } from 'react';
import type { Alerts } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { ERROR_FETCH_BROWSER_FIELDS } from './translations';
import { useAlertDataView } from '../../../hooks/use_alert_data_view';
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
export const getDataViewStateFromIndexFields = memoizeOne(
  (
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
      browserFields[category].fields[field.name] = field as unknown as BrowserField;

      return browserFields;
    }, {});
  },
  (newArgs, lastArgs) =>
    newArgs[0] === lastArgs[0] &&
    newArgs[1].length === lastArgs[1].length &&
    newArgs[2] === lastArgs[2]
);

export const useFetchBrowserFieldCapabilities = ({
  featureIds,
  initialBrowserFields,
}: FetchAlertsArgs): [boolean | undefined, BrowserFields] => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [browserFields, setBrowserFields] = useState<BrowserFields>(
    () => initialBrowserFields ?? {}
  );

  const { value: dataView, loading, error } = useAlertDataView(featureIds);

  useEffect(() => {
    if (initialBrowserFields) {
      // Event if initial browser fields is empty, assign it
      // because client may be doing it to hide Fields Browser
      setBrowserFields(initialBrowserFields);
      return;
    }

    if (dataView == null) {
      return;
    }

    setBrowserFields(
      getDataViewStateFromIndexFields(
        dataView.id ?? '',
        dataView.fields != null ? dataView.fields : []
      )
    );
  }, [featureIds, initialBrowserFields, loading, dataView]);

  useEffect(() => {
    if (error) {
      toasts.addDanger(ERROR_FETCH_BROWSER_FIELDS);
    }
  }, [error, toasts]);

  return [loading, browserFields];
};
