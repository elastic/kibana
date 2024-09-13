/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { BASE_ALERTING_API_PATH, RuleTypeParams } from '@kbn/alerting-plugin/common';
import { v4 } from 'uuid';
import type {
  CreateRuleRequestBody,
  CreateRuleResponse,
} from '@kbn/alerting-plugin/common/routes/rule/apis/create';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useKibana } from '../utils/kibana_react';

export function useCreateRule<Params extends RuleTypeParams = never>() {
  const {
    http,
    i18n: i18nStart,
    notifications: { toasts },
    theme,
  } = useKibana().services;

  let loadingToastId = '';

  const showLoadingToast = () => {
    const loadingToast = toasts.addInfo({
      title: toMountPoint(
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.slo.rules.createRule.loadingNotification.descriptionText', {
              defaultMessage: 'Creating burn rate rule ...',
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        </EuiFlexGroup>,
        { i18n: i18nStart, theme }
      ),
    });
    loadingToastId = loadingToast.id;
  };

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
        showLoadingToast();
        return http.post(`${BASE_ALERTING_API_PATH}/rule/${ruleId}`, {
          body,
        });
      } catch (e) {
        throw new Error(`Unable to create burn rate rule: ${e}`);
      }
    },
    {
      onError: (_err) => {
        if (loadingToastId) {
          toasts.remove(loadingToastId);
        }
        toasts.addDanger(
          i18n.translate('xpack.slo.rules.createRule.errorNotification.descriptionText', {
            defaultMessage: 'Failed to create burn rate rule.',
          })
        );
      },

      onSuccess: () => {
        if (loadingToastId) {
          toasts.remove(loadingToastId);
        }
        toasts.addSuccess(
          i18n.translate('xpack.slo.rules.createRule.successNotification.descriptionText', {
            defaultMessage: 'Burn rate rule created successfully.',
          })
        );
      },
    }
  );

  return createRule;
}
