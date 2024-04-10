/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { RuleFormPage } from '@kbn/alerts-ui-shared';
import { getRuleDetailsRoute } from '@kbn/rule-data-utils';
import { useKibana } from '../../../common';

interface MatchParams {
  ruleId: string;
}

export interface EditRuleLocationState {
  referrer: string;
  ruleName?: string;
}

export const EditRulePage: React.FC<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { ruleId },
  },
  location,
  history,
}) => {
  const { referrer = getRuleDetailsRoute(ruleId), ruleName } = (location.state ??
    {}) as EditRuleLocationState;

  const [ruleTypeId, setRuleTypeId] = useState<string | null>(null);
  const [dispalyedRuleName, setDisplayedRuleName] = useState<string | undefined>(ruleName);

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
    () => (ruleTypeId ? ruleTypeRegistry.get(ruleTypeId) : null),
    [ruleTypeId, ruleTypeRegistry]
  );

  const isRuleTypeModelPending = useMemo(() => !ruleTypeId, [ruleTypeId]);

  const onLoadRuleSuccess = useCallback((id: string, name: string) => {
    setRuleTypeId(id);
    setDisplayedRuleName(name);
  }, []);

  const onClickReturn = useCallback(() => {
    navigateToUrl(referrer);
  }, [referrer, navigateToUrl]);

  const onSaveRule = useCallback(() => {
    navigateToUrl(referrer);
  }, [referrer, navigateToUrl]);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('xpack.triggersActionsUI.sections.editRule.breadcrumbsRulesTitle', {
          defaultMessage: 'Rules',
        }),
        href: '/rules',
      },
      {
        text:
          dispalyedRuleName ??
          i18n.translate('xpack.triggersActionsUI.sections.editRule.breadcrumbsRuleTitleLoading', {
            defaultMessage: 'Loading rule name…',
          }),
        href: getRuleDetailsRoute(ruleId),
      },
      {
        text: i18n.translate('xpack.triggersActionsUI.sections.editRule.breadcrumbsEditTitle', {
          defaultMessage: 'Edit',
        }),
      },
    ]);
  }, [setBreadcrumbs, ruleId, dispalyedRuleName]);

  return (
    <RuleFormPage
      isEdit
      ruleId={ruleId}
      isRuleTypeModelPending={isRuleTypeModelPending}
      onLoadRuleSuccess={onLoadRuleSuccess}
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
      appContext={{ canShowConsumerSelection: false }}
      onClickReturn={onClickReturn}
      onSaveRule={onSaveRule}
    />
  );
};
