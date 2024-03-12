/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { useEffect, useMemo, useState } from 'react';
import { EcsFlat } from '@elastic/ecs';
import { EcsMetadata } from '@kbn/alerts-as-data-utils/src/field_maps/types';
import { isEmpty } from 'lodash';

export const getDescription = (fieldName: string, ecsFlat: Record<string, EcsMetadata>) => {
  let ecsField = ecsFlat[fieldName];
  if (isEmpty(ecsField?.description ?? '') && fieldName.includes('kibana.alert.')) {
    ecsField = ecsFlat[fieldName.replace('kibana.alert.', '')];
  }
  return ecsField?.description ?? '';
};

async function loadRuleTypeAadTemplateFields({
  http,
  ruleTypeId,
}: {
  http: HttpStart;
  ruleTypeId: string;
}): Promise<DataViewField[]> {
  if (!ruleTypeId || !http) return [];
  const fields = await http.get<DataViewField[]>(`${BASE_RAC_ALERTS_API_PATH}/aad_fields`, {
    query: { ruleTypeId },
  });

  return fields;
}

export function useRuleTypeAadTemplateFields(
  http: HttpStart,
  ruleTypeId: string | undefined,
  enabled: boolean
): { isLoading: boolean; fields: ActionVariable[] } {
  // Reimplement useQuery here; this hook is sometimes called in contexts without a QueryClientProvider
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DataViewField[]>([]);

  useEffect(() => {
    if (enabled && data.length === 0 && ruleTypeId) {
      setIsLoading(true);
      loadRuleTypeAadTemplateFields({ http, ruleTypeId }).then((res) => {
        setData(res);
        setIsLoading(false);
      });
    }
  }, [data, enabled, http, ruleTypeId]);

  return useMemo(
    () => ({
      isLoading,
      fields: data.map<ActionVariable>((d) => ({
        name: d.name,
        description: getDescription(d.name, EcsFlat),
      })),
    }),
    [data, isLoading]
  );
}
