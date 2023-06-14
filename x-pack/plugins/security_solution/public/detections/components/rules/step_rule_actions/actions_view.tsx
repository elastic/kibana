/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiSpacer, EuiFlexItem } from '@elastic/eui';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import {
  useFetchConnectors,
  useFetchConnectorTypes,
} from '../../../../detection_engine/rule_management/api/hooks/use_fetch_connectors';
import { useKibana } from '../../../../common/lib/kibana';
import type { ActionsStepRule } from '../../../pages/detection_engine/rules/types';
import { StepPanel } from '../step_panel';
import { NotificationAction } from './notification_action';
import { ResponseAction } from './response_action';
import * as i18n from './translations';

interface StepActionsRuleProps {
  ruleActionsData: ActionsStepRule;
  isRuleLoading: boolean;
}

export const StepActionsRule: React.FC<StepActionsRuleProps> = ({
  ruleActionsData,
  isRuleLoading,
}) => {
  const {
    services: { triggersActionsUi },
  } = useKibana();

  const actionTypeRegistry = triggersActionsUi.actionTypeRegistry as ActionTypeRegistryContract;

  const { data: connectors } = useFetchConnectors();
  const { data: connectorTypes } = useFetchConnectorTypes();

  const notificationActions = ruleActionsData.actions;
  const responseActions = ruleActionsData.responseActions || [];

  const ruleHasNoActions = notificationActions.length === 0 && responseActions.length === 0;

  if (ruleHasNoActions || !connectors || !connectorTypes || !ruleActionsData) {
    return null;
  }

  const hasBothNotificationAndResponseActions =
    notificationActions.length > 0 && responseActions.length > 0;

  return (
    <EuiFlexItem data-test-subj="actions" component="section" grow={1}>
      <StepPanel loading={isRuleLoading} title={i18n.ACTIONS}>
        {notificationActions.length > 0 && (
          <>
            <EuiText size="m">{i18n.NOTIFICATION_ACTIONS}</EuiText>
            <EuiSpacer size="s" />
          </>
        )}
        {notificationActions.map((action, index) => {
          const isLastItem = index === responseActions.length - 1;
          return (
            <>
              <NotificationAction
                action={action}
                connectorTypes={connectorTypes}
                connectors={connectors}
                actionTypeRegistry={actionTypeRegistry}
                key={action.id}
              />
              {!isLastItem && <EuiSpacer size="s" />}
            </>
          );
        })}

        {hasBothNotificationAndResponseActions && <EuiSpacer size="m" />}

        {responseActions.length > 0 && (
          <>
            <EuiText size="m">{i18n.RESPONSE_ACTIONS}</EuiText>
            <EuiSpacer size="s" />
          </>
        )}
        {responseActions.map((action, index) => {
          const isLastItem = index === responseActions.length - 1;
          return (
            <>
              <ResponseAction action={action} key={`${action.actionTypeId}-${index}`} />
              {!isLastItem && <EuiSpacer size="s" />}
            </>
          );
        })}
      </StepPanel>
    </EuiFlexItem>
  );
};
