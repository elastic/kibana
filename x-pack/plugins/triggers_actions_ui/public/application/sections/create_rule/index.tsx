/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingLogo, EuiEmptyPrompt } from '@elastic/eui';
import { RuleFormPage } from '@kbn/alerts-ui-shared';
import { useKibana } from '../../../common';
import { useLoadRuleTypesQuery } from '../../hooks/use_load_rule_types_query';

export const CreateRulePage: React.FC = ({
  match: {
    params: { ruleTypeId },
  },
}) => {
  const { setBreadcrumbs, ruleTypeRegistry } = useKibana().services;
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

  useEffect(() => {
    setBreadcrumbs(
      [
        {
          text: 'Rules',
          href: '/rules',
        },
        {
          text: 'Create',
        },
      ].concat(ruleTypeFromServer ? [{ text: ruleTypeFromServer.name }] : [])
    );
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
  console.log('RULE TYPE MODEL', {
    name: ruleTypeFromServer.name,
    ...registeredRuleType,
  });
  return (
    <RuleFormPage
      ruleTypeModel={{
        name: ruleTypeFromServer.name,
        ...registeredRuleType,
      }}
    />
  );
};
