/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { fetchRuleTypeAadTemplateFields } from '@kbn/alerts-ui-shared/src/common/apis/fetch_rule_type_aad_template_fields';
import { TriggersAndActionsUiServices } from '../..';

const EMPTY_AAD_FIELDS: DataViewField[] = [];

export function useRuleAADFields(ruleTypeId?: string): {
  aadFields: DataViewField[];
  loading: boolean;
} {
  const {
    http,
    notifications: { toasts },
  } = useKibana<TriggersAndActionsUiServices>().services;

  const queryAadFieldsFn = () => {
    return fetchRuleTypeAadTemplateFields({ http, ruleTypeId });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.useRuleAADFields.errorMessage', {
        defaultMessage: 'Unable to load alert fields per rule type',
      })
    );
  };

  const {
    data: aadFields = EMPTY_AAD_FIELDS,
    isInitialLoading,
    isLoading,
  } = useQuery({
    queryKey: ['loadAlertAadFieldsPerRuleType', ruleTypeId],
    queryFn: queryAadFieldsFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    enabled: ruleTypeId !== undefined,
  });

  return useMemo(
    () => ({
      aadFields,
      loading: ruleTypeId === undefined ? false : isInitialLoading || isLoading,
    }),
    [aadFields, isInitialLoading, isLoading, ruleTypeId]
  );
}
