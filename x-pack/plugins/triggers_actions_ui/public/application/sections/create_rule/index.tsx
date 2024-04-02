/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiLoadingLogo, EuiEmptyPrompt } from '@elastic/eui';
import { RuleFormPage } from '@kbn/alerts-ui-shared';
import { useKibana } from '../../../common';
import { useLoadRuleTypesQuery } from '../../hooks/use_load_rule_types_query';

interface MatchParams {
  ruleTypeId: string;
}

export interface CreateRuleLocationState {
  referrer: string;
}

export const CreateRulePage: React.FC<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { ruleTypeId },
  },
  location,
  history,
}) => {
  const { setBreadcrumbs, ruleTypeRegistry, docLinks, charts, data, dataViews, unifiedSearch } =
    useKibana().services;
  const {
    ruleTypesState,
    authorizedRuleTypes,
    isSuccess: isLoadRuleTypesSuccess,
  } = useLoadRuleTypesQuery({ filteredRuleTypes: [] });

  const ruleTypeFromServer = useMemo(
    () => authorizedRuleTypes.find((ruleType) => ruleType.id === ruleTypeId),
    [authorizedRuleTypes, ruleTypeId]
  );

  const registeredRuleType = useMemo(
    () => ruleTypeRegistry.get(ruleTypeId),
    [ruleTypeId, ruleTypeRegistry]
  );

  const { referrer } = (location.state ?? {}) as CreateRuleLocationState;
  const onClickReturn = useCallback(() => {
    history.push(referrer);
  }, [referrer, history]);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: 'Rules',
        href: '/rules',
      },
      {
        text: 'Create',
      },
    ]);
  }, [setBreadcrumbs, ruleTypeFromServer]);

  if (ruleTypesState.isLoading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo size="xl" />}
        title={
          <h2>
            {i18n.translate('xpack.triggersActionsUI.sections.createRule.loadingTitle', {
              defaultMessage: 'Loading Rule Form',
            })}
          </h2>
        }
      />
    );
  }

  if (!isLoadRuleTypesSuccess) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={
          <h2>
            {i18n.translate('xpack.triggersActionsUI.sections.createRule.errorTitle', {
              defaultMessage: 'Error loading rule form',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.triggersActionsUI.sections.createRule.errorMessage', {
              defaultMessage: 'An error occurred while loading rule types',
            })}
          </p>
        }
      />
    );
  }

  if (!ruleTypeFromServer || !registeredRuleType) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={
          <h2>
            {i18n.translate('xpack.triggersActionsUI.sections.createRule.unauthorizedErrorTitle', {
              defaultMessage: 'Rule type not found or unauthorized',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.createRule.unauthorizedErrorMessage',
              {
                defaultMessage: 'No authorized rule type with the id {ruleTypeId} could be found',
                values: { ruleTypeId },
              }
            )}
          </p>
        }
      />
    );
  }
  return (
    <RuleFormPage
      ruleTypeModel={{
        name: ruleTypeFromServer.name,
        ...registeredRuleType,
      }}
      expressionPlugins={{
        charts,
        data,
        dataViews,
        unifiedSearch,
      }}
      docLinks={docLinks}
      onClickReturn={onClickReturn}
      referrerHref={referrer}
    />
  );
};
