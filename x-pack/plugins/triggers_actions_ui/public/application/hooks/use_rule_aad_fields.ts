/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import useAsync from 'react-use/lib/useAsync';
import type { AsyncState } from 'react-use/lib/useAsync';
import { TriggersAndActionsUiServices } from '../..';

export function useRuleAADFields(ruleTypeId?: string): AsyncState<DataViewField[]> {
  const { http } = useKibana<TriggersAndActionsUiServices>().services;

  const aadFields = useAsync(async () => {
    if (!ruleTypeId) return [];
    const fields = await http.get<DataViewField[]>(`${BASE_RAC_ALERTS_API_PATH}/aad_fields`, {
      query: { ruleTypeId },
    });

    return fields;
  });

  return aadFields;
}
