/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback, useEffect, useState } from 'react';
import { RuntimeField } from '@kbn/data-views-plugin/common';
import { IFieldSubType } from '@kbn/es-query';

export interface FetchAlertsArgs {
  featureIds: ValidFeatureId[];
}

export interface FetchAlertResp {
  alerts: EcsFieldsResponse[];
}

interface BrowserField {
  aggregatable: boolean;
  category: string;
  description: string | null;
  example: string | number | null;
  fields: Readonly<Record<string, Partial<BrowserField>>>;
  format: string;
  indexes?: string[];
  name: string;
  searchable: boolean;
  type: string;
  esTypes?: string[];
  subType?: IFieldSubType;
  readFromDocValues: boolean;
  runtimeField?: RuntimeField;
}

export type BrowserFields = {
  [category in string]: { fields: { [fieldName in string]: BrowserField } };
};

export type UseFetchAlerts = ({ featureIds }: FetchAlertsArgs) => [boolean, FetchAlertResp];

export const useFetchBrowserFieldCapabilities = ({
  featureIds,
}: FetchAlertsArgs): [boolean | undefined, BrowserFields] => {
  const { http } = useKibana().services;
  const [isLoading, setIsLoading] = useState<boolean | undefined>(undefined);
  const [browserFields, setBrowserFields] = useState<BrowserFields>(() => ({}));

  const getBrowserFieldInfo = useCallback(async () => {
    if (!http) return Promise.resolve({});

    return await http.get<BrowserFields>(`${BASE_RAC_ALERTS_API_PATH}/browser_fields`, {
      query: { featureIds },
    });
  }, [featureIds, http]);

  useEffect(() => {
    if (isLoading !== undefined) return;

    setIsLoading(true);

    const callApi = async () => {
      const browserFieldsInfo = await getBrowserFieldInfo();
      setIsLoading(false);
      setBrowserFields(browserFieldsInfo);
    };

    callApi();
  }, [getBrowserFieldInfo, isLoading]);

  return [isLoading, browserFields];
};
