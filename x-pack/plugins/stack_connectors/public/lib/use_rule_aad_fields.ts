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
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

async function loadRuleTypeAADFields({
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

export function useRuleTypeAADFields(
  http: HttpStart,
  ruleTypeId: string,
  enabled: boolean
): { isLoading: boolean; fields: ActionVariable[] } {
  const queryFn = () => {
    return loadRuleTypeAADFields({ http, ruleTypeId });
  };

  const { data = [], isLoading = false } = useQuery({
    queryKey: ['loadRuleTypeAADFields'],
    queryFn,
    refetchOnWindowFocus: false,
    enabled,
  });

  return useMemo(
    () => ({
      isLoading,
      fields: data.map<ActionVariable>((d) => ({ name: d.name, description: d.displayName })),
    }),
    [data, isLoading]
  );
}
