/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidFeatureId, ValidFeatureId } from '@kbn/rule-data-utils';
import { BASE_RAC_ALERTS_API_PATH, BrowserFields } from '@kbn/rule-registry-plugin/common';
import { useCallback, useEffect, useState } from 'react';
import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
import type { Alerts } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { ERROR_FETCH_BROWSER_FIELDS } from './translations';

export type FetchAlertsArgs = {
  initialBrowserFields?: BrowserFields;
} & (
  | {
      // @deprecated should use ruleTypeIds
      featureIds: ValidFeatureId[];
      ruleTypeIds?: never;
    }
  | {
      featureIds?: never;
      ruleTypeIds: string[];
    }
);

export interface FetchAlertResp {
  alerts: Alerts;
}

export type UseFetchAlerts = ({ featureIds }: FetchAlertsArgs) => [boolean, FetchAlertResp];

const INVALID_FEATURE_ID = 'siem';

export const useFetchBrowserFieldCapabilities = ({
  featureIds,
  ruleTypeIds,
  initialBrowserFields,
}: FetchAlertsArgs): [boolean | undefined, BrowserFields, unknown[]] => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [isLoading, setIsLoading] = useState<boolean | undefined>(undefined);
  const [browserFields, setBrowserFields] = useState<BrowserFields>(
    () => initialBrowserFields ?? {}
  );
  const [fields, setFields] = useState<FieldDescriptor[]>([]);

  const getBrowserFieldInfo = useCallback(
    async (
      validFeatureId?: ValidFeatureId[],
      validRuleTypeIds?: string[]
    ): Promise<{
      browserFields: BrowserFields;
      fields: FieldDescriptor[];
    }> => {
      if (!http) return Promise.resolve({ browserFields: {}, fields: [] });

      try {
        return await http.get<{ browserFields: BrowserFields; fields: FieldDescriptor[] }>(
          `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
          {
            query: { featureIds: validFeatureId, rule_type_ids: validRuleTypeIds },
          }
        );
      } catch (e) {
        toasts.addDanger(ERROR_FETCH_BROWSER_FIELDS);
        return Promise.resolve({ browserFields: {}, fields: [] });
      }
    },
    [http, toasts]
  );

  useEffect(() => {
    if (initialBrowserFields) {
      // Event if initial browser fields is empty, assign it
      // because client may be doing it to hide Fields Browser
      setBrowserFields(initialBrowserFields);
      return;
    }
    const validFeatureIdTmp = featureIds?.filter((fid) => isValidFeatureId(fid)) ?? [];
    if (
      isLoading !== undefined ||
      (featureIds && featureIds.includes(INVALID_FEATURE_ID)) ||
      (featureIds && validFeatureIdTmp.length === 0) ||
      (ruleTypeIds && ruleTypeIds.length === 0)
    ) {
      return;
    }

    setIsLoading(true);

    const callApi = async (validFeatureId: ValidFeatureId[]) => {
      const { browserFields: browserFieldsInfo, fields: newFields } = await getBrowserFieldInfo(
        validFeatureId,
        ruleTypeIds
      );
      setFields(newFields);
      setBrowserFields(browserFieldsInfo);
      setIsLoading(false);
    };
    callApi(validFeatureIdTmp);
  }, [getBrowserFieldInfo, isLoading, featureIds, initialBrowserFields, ruleTypeIds]);

  return [isLoading, browserFields, fields];
};
