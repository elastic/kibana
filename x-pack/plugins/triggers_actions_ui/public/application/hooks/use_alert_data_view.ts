/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import useAsync from 'react-use/lib/useAsync';
import { useMemo } from 'react';
import { TriggersAndActionsUiServices } from '../..';

export interface UserAlertDataView {
  value?: DataView[];
  loading: boolean;
  error?: Error;
}

export function useAlertDataView(featureIds: ValidFeatureId[]): UserAlertDataView {
  const { http } = useKibana<TriggersAndActionsUiServices>().services;
  const features = featureIds.sort().join(',');

  const indexNames = useAsync(async () => {
    const { index_name: indexNamesStr } = await http.get<{ index_name: string[] }>(
      `${BASE_RAC_ALERTS_API_PATH}/index`,
      {
        query: { features },
      }
    );

    return indexNamesStr;
  }, [features]);

  const fields = useAsync(async () => {
    const { fields: alertFields } = await http.get<{ fields: FieldSpec[] }>(
      `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
      {
        query: { featureIds },
      }
    );
    return alertFields;
  }, [features]);

  const dataview = useMemo(
    () =>
      !fields.loading &&
      !indexNames.loading &&
      fields.error === undefined &&
      indexNames.error === undefined
        ? ([
            {
              title: (indexNames.value ?? []).join(','),
              fieldFormatMap: {},
              fields: (fields.value ?? [])?.map((field) => {
                return {
                  ...field,
                  ...(field.esTypes && field.esTypes.includes('flattened')
                    ? { type: 'string' }
                    : {}),
                };
              }),
            },
          ] as unknown as DataView[])
        : undefined,
    [fields, indexNames]
  );

  return {
    value: dataview,
    loading: fields.loading || indexNames.loading,
    error: fields.error ? fields.error : indexNames.error,
  };
}
