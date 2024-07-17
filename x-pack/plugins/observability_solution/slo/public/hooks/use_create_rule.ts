/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { BASE_ALERTING_API_PATH, RuleTypeParams } from '@kbn/alerting-plugin/common';
import { v4 } from 'uuid';
import type {
  CreateRuleRequestBody,
  CreateRuleResponse,
} from '@kbn/alerting-plugin/common/routes/rule/apis/create';
import { useKibana } from '../utils/kibana_react';

export function useCreateRule<Params extends RuleTypeParams = never>() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const createRule = useMutation<
    CreateRuleResponse<Params>,
    Error,
    { rule: CreateRuleRequestBody<Params> }
  >(
    ['createRule'],
    ({ rule }) => {
      try {
        const ruleId = v4();
        const body = JSON.stringify(rule);
        return http.post(`${BASE_ALERTING_API_PATH}/rule/${ruleId}`, {
          body,
        });
      } catch (e) {
        throw new Error(`Unable to create rule: ${e}`);
      }
    },
    {
      onError: (_err) => {
        toasts.addDanger(
          i18n.translate('xpack.slo.rules.createRule.errorNotification.descriptionText', {
            defaultMessage: 'Failed to create rule',
          })
        );
      },

      onSuccess: () => {
        toasts.addSuccess(
          i18n.translate('xpack.slo.rules.createRule.successNotification.descriptionText', {
            defaultMessage: 'Rule created',
          })
        );
      },
    }
  );

  return createRule;
}
