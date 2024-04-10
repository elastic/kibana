/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useCallback } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { RuleFormPage } from '@kbn/alerts-ui-shared';
import { RuleCreationValidConsumer, getRuleDetailsRoute } from '@kbn/rule-data-utils';
import { useKibana } from '../../../common';

interface MatchParams {
  ruleTypeId: string;
}

export interface CreateRuleLocationState {
  referrer: string;
  consumer: RuleCreationValidConsumer;
  validConsumers?: RuleCreationValidConsumer[];
}

export const CreateRulePage: React.FC<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { ruleTypeId },
  },
  location,
  history,
}) => {
  const { referrer, consumer, validConsumers } = (location.state ?? {}) as CreateRuleLocationState;

  const {
    application: { navigateToUrl },
    http,
    notifications: { toasts },
    setBreadcrumbs,
    ruleTypeRegistry,
    docLinks,
    charts,
    data,
    dataViews,
    unifiedSearch,
  } = useKibana().services;

  const registeredRuleType = useMemo(
    () => ruleTypeRegistry.get(ruleTypeId),
    [ruleTypeId, ruleTypeRegistry]
  );

  const onClickReturn = useCallback(() => {
    navigateToUrl(referrer);
  }, [referrer, navigateToUrl]);

  const onSaveRule = useCallback(
    (ruleId: string) => {
      history.push(getRuleDetailsRoute(ruleId));
    },
    [history]
  );

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('xpack.triggersActionsUI.sections.createRule.breadcrumbsRulesTitle', {
          defaultMessage: 'Rules',
        }),
        href: '/rules',
      },
      {
        text: i18n.translate('xpack.triggersActionsUI.sections.createRule.breadcrumbsCreateTitle', {
          defaultMessage: 'Create',
        }),
      },
    ]);
  }, [setBreadcrumbs]);

  return (
    <RuleFormPage
      http={http}
      toasts={toasts}
      registeredRuleTypeModel={registeredRuleType}
      expressionPlugins={{
        charts,
        data,
        dataViews,
        unifiedSearch,
      }}
      docLinks={docLinks}
      referrerHref={referrer}
      appContext={{ consumer, validConsumers, canShowConsumerSelection: true }}
      onClickReturn={onClickReturn}
      onSaveRule={onSaveRule}
    />
  );
};
