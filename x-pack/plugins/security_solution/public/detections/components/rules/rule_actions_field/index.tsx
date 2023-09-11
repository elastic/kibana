/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { EuiSpacer, EuiCallOut, EuiText } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import deepMerge from 'deepmerge';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';

import type {
  ActionVariables,
  NotifyWhenSelectOptions,
} from '@kbn/triggers-actions-ui-plugin/public';
import type {
  RuleAction,
  RuleActionAlertsFilterProperty,
  RuleActionParam,
} from '@kbn/alerting-plugin/common';
import { SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { NOTIFICATION_DEFAULT_FREQUENCY } from '../../../../../common/constants';
import type { FieldHook } from '../../../../shared_imports';
import { useFormContext } from '../../../../shared_imports';
import { useKibana } from '../../../../common/lib/kibana';
import {
  FORM_CUSTOM_FREQUENCY_OPTION,
  FORM_ERRORS_TITLE,
  FORM_ON_ACTIVE_ALERT_OPTION,
  FORM_FOR_EACH_ALERT_BODY_MESSAGE,
  FORM_SUMMARY_BODY_MESSAGE,
} from './translations';

const NOTIFY_WHEN_OPTIONS: NotifyWhenSelectOptions[] = [
  {
    isSummaryOption: true,
    isForEachAlertOption: true,
    value: {
      value: 'onActiveAlert',
      inputDisplay: FORM_ON_ACTIVE_ALERT_OPTION,
      'data-test-subj': 'onActiveAlert',
      dropdownDisplay: (
        <EuiText size="s">
          <p>
            <FormattedMessage
              defaultMessage="Per rule run"
              id="xpack.securitySolution.detectionEngine.ruleNotifyWhen.onActiveAlert.label"
            />
          </p>
        </EuiText>
      ),
    },
  },
  {
    isSummaryOption: true,
    isForEachAlertOption: false,
    value: {
      value: 'onThrottleInterval',
      inputDisplay: FORM_CUSTOM_FREQUENCY_OPTION,
      'data-test-subj': 'onThrottleInterval',
      dropdownDisplay: (
        <EuiText size="s">
          <p>
            <FormattedMessage
              defaultMessage="Custom frequency"
              id="xpack.securitySolution.detectionEngine.ruleNotifyWhen.onThrottleInterval.label"
            />
          </p>
        </EuiText>
      ),
    },
  },
];

interface Props {
  field: FieldHook;
  messageVariables: ActionVariables;
  summaryMessageVariables: ActionVariables;
}

const DEFAULT_ACTION_GROUP_ID = 'default';

const FieldErrorsContainer = styled.div`
  p {
    margin-bottom: 0;
  }
`;

const ContainerActions = styled.div.attrs(
  ({ className = '', $caseIndexes = [] }: { className?: string; $caseIndexes: string[] }) => ({
    className,
  })
)<{ $caseIndexes: string[] }>`
  ${({ $caseIndexes }) =>
    $caseIndexes.map(
      (index) => `
        div[id="${index}"].euiAccordion__childWrapper .euiAccordion__children {
          padding: 0px;
          .euiFlexGroup {
            display: none;
          }
          .euiSpacer.euiSpacer--xl {
            height: 0px;
          }
        }
      `
    )}
`;

export const RuleActionsField: React.FC<Props> = ({
  field,
  messageVariables,
  summaryMessageVariables,
}) => {
  const [fieldErrors, setFieldErrors] = useState<string | null>(null);
  const form = useFormContext();
  const { isValid } = form;
  const {
    triggersActionsUi: { getActionForm },
  } = useKibana().services;

  // Workaround for setAlertActionsProperty being fired with prevProps when followed by setActionIdByIndex
  // For details see: https://github.com/elastic/kibana/issues/142217
  const [isInitializingAction, setIsInitializingAction] = useState(false);

  const actions: RuleAction[] = useMemo(
    () => (!isEmpty(field.value) ? (field.value as RuleAction[]) : []),
    [field.value]
  );

  const caseActionIndexes = useMemo(
    () =>
      actions.reduce<string[]>((acc, action, actionIndex) => {
        if (action.actionTypeId === '.case') {
          return [...acc, `${actionIndex}`];
        }
        return acc;
      }, []),
    [actions]
  );

  const setActionIdByIndex = useCallback(
    (id: string, index: number) => {
      const updatedActions = [...(actions as Array<Partial<RuleAction>>)];
      if (isEmpty(updatedActions[index].params)) {
        setIsInitializingAction(true);
      }
      updatedActions[index] = deepMerge(updatedActions[index], { id });
      field.setValue(updatedActions);
    },
    [field, actions]
  );

  const setAlertActionsProperty = useCallback(
    (updatedActions: RuleAction[]) => field.setValue(updatedActions),
    [field]
  );

  const setActionParamsProperty = useCallback(
    (key: string, value: RuleActionParam, index: number) => {
      // validation is not triggered correctly when actions params updated (more details in https://github.com/elastic/kibana/issues/142217)
      // wrapping field.setValue in setTimeout fixes the issue above
      // and triggers validation after params have been updated, however it introduced a new issue where any additional input
      // would result in the cursor jumping to the end of the text area (https://github.com/elastic/kibana/issues/149885)
      const updateValue = () => {
        field.setValue((prevValue: RuleAction[]) => {
          const updatedActions = [...prevValue];
          updatedActions[index] = {
            ...updatedActions[index],
            params: {
              ...updatedActions[index].params,
              [key]: value,
            },
          };
          return updatedActions;
        });
      };

      if (isInitializingAction) {
        setTimeout(updateValue, 0);
        setIsInitializingAction(false);
      } else {
        updateValue();
      }
    },
    [field, isInitializingAction]
  );

  const setActionAlertsFilterProperty = useCallback(
    (key: string, value: RuleActionAlertsFilterProperty, index: number) => {
      field.setValue((prevValue: RuleAction[]) => {
        const updatedActions = [...prevValue];
        const { alertsFilter, ...rest } = updatedActions[index];
        const updatedAlertsFilter = { ...alertsFilter };

        if (value) {
          updatedAlertsFilter[key] = value;
        } else {
          delete updatedAlertsFilter[key];
        }

        updatedActions[index] = {
          ...rest,
          ...(!isEmpty(updatedAlertsFilter) ? { alertsFilter: updatedAlertsFilter } : {}),
        };
        return updatedActions;
      });
    },
    [field]
  );

  const setActionFrequency = useCallback(
    (key: string, value: RuleActionParam, index: number) => {
      field.setValue((prevValue: RuleAction[]) => {
        const updatedActions = [...prevValue];
        updatedActions[index] = {
          ...updatedActions[index],
          frequency: {
            ...(updatedActions[index].frequency ?? NOTIFICATION_DEFAULT_FREQUENCY),
            [key]: value,
          },
        };
        return updatedActions;
      });
    },
    [field]
  );

  const isFormValidated = isValid !== undefined;
  const actionForm = useMemo(
    () =>
      getActionForm({
        actions,
        messageVariables,
        summaryMessageVariables,
        defaultActionGroupId: DEFAULT_ACTION_GROUP_ID,
        setActionIdByIndex,
        setActions: setAlertActionsProperty,
        setActionParamsProperty,
        setActionFrequencyProperty: setActionFrequency,
        setActionAlertsFilterProperty,
        featureId: SecurityConnectorFeatureId,
        producerId: AlertConsumers.SIEM,
        defaultActionMessage: FORM_FOR_EACH_ALERT_BODY_MESSAGE,
        defaultSummaryMessage: FORM_SUMMARY_BODY_MESSAGE,
        hideActionHeader: true,
        hasAlertsMappings: true,
        notifyWhenSelectOptions: NOTIFY_WHEN_OPTIONS,
        defaultRuleFrequency: NOTIFICATION_DEFAULT_FREQUENCY,
        disableErrorMessages: !isFormValidated,
      }),
    [
      actions,
      getActionForm,
      messageVariables,
      summaryMessageVariables,
      setActionFrequency,
      setActionIdByIndex,
      setActionParamsProperty,
      setAlertActionsProperty,
      setActionAlertsFilterProperty,
      isFormValidated,
    ]
  );

  useEffect(() => {
    if (isValid === false) {
      const errorsString = field.errors.map(({ message }) => message).join('\n');
      return setFieldErrors(errorsString);
    }
    return setFieldErrors(null);
  }, [field.errors, isValid]);

  return (
    <ContainerActions $caseIndexes={caseActionIndexes}>
      {fieldErrors ? (
        <>
          <FieldErrorsContainer>
            <EuiCallOut title={FORM_ERRORS_TITLE} color="danger" iconType="warning">
              <ReactMarkdown>{fieldErrors}</ReactMarkdown>
            </EuiCallOut>
          </FieldErrorsContainer>
          <EuiSpacer />
        </>
      ) : null}
      {actionForm}
    </ContainerActions>
  );
};
