/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import deepMerge from 'deepmerge';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';

import type { ActionVariables } from '@kbn/triggers-actions-ui-plugin/public';
import type { RuleAction, RuleActionParam } from '@kbn/alerting-plugin/common';
import { SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { FieldHook } from '../../../../shared_imports';
import { useFormContext } from '../../../../shared_imports';
import { useKibana } from '../../../../common/lib/kibana';
import { FORM_ERRORS_TITLE } from './translations';

interface Props {
  field: FieldHook;
  messageVariables: ActionVariables;
}

const DEFAULT_ACTION_GROUP_ID = 'default';
const DEFAULT_ACTION_MESSAGE =
  'Rule {{context.rule.name}} generated {{state.signals_count}} alerts';

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
        div[id="${index}"].euiAccordion__childWrapper .euiAccordion__padding--l {
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

export const RuleActionsField: React.FC<Props> = ({ field, messageVariables }) => {
  const [fieldErrors, setFieldErrors] = useState<string | null>(null);
  const form = useFormContext();
  const { isSubmitted, isSubmitting, isValid } = form;
  const {
    triggersActionsUi: { getActionForm },
  } = useKibana().services;

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
      // and triggers validation after params have been updated
      setTimeout(
        () =>
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
          }),
        0
      );
    },
    [field]
  );

  const actionForm = useMemo(
    () =>
      getActionForm({
        actions,
        messageVariables,
        defaultActionGroupId: DEFAULT_ACTION_GROUP_ID,
        setActionIdByIndex,
        setActions: setAlertActionsProperty,
        setActionParamsProperty,
        setActionFrequencyProperty: () => {},
        featureId: SecurityConnectorFeatureId,
        defaultActionMessage: DEFAULT_ACTION_MESSAGE,
        hideActionHeader: true,
        hideNotifyWhen: true,
      }),
    [
      actions,
      getActionForm,
      messageVariables,
      setActionIdByIndex,
      setActionParamsProperty,
      setAlertActionsProperty,
    ]
  );

  useEffect(() => {
    if (isSubmitting || !field.errors.length) {
      return setFieldErrors(null);
    }
    if (isSubmitted && !isSubmitting && isValid === false && field.errors.length) {
      const errorsString = field.errors.map(({ message }) => message).join('\n');
      return setFieldErrors(errorsString);
    }
  }, [isSubmitted, isSubmitting, field.isChangingValue, isValid, field.errors, setFieldErrors]);

  return (
    <ContainerActions $caseIndexes={caseActionIndexes}>
      {fieldErrors ? (
        <>
          <FieldErrorsContainer>
            <EuiCallOut title={FORM_ERRORS_TITLE} color="danger" iconType="alert">
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
