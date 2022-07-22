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

import type { ActionType, ActionVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { loadActionTypes } from '@kbn/triggers-actions-ui-plugin/public';
import type { RuleAction } from '@kbn/alerting-plugin/common';
import { NOTIFICATION_SUPPORTED_ACTION_TYPES_IDS } from '../../../../../common/constants';
import type { FieldHook } from '../../../../shared_imports';
import { useFormContext } from '../../../../shared_imports';
import { convertArrayToCamelCase, useKibana } from '../../../../common/lib/kibana';
import { FORM_ERRORS_TITLE } from './translations';

interface Props {
  field: FieldHook;
  hasErrorOnCreationCaseAction: boolean;
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

export const getSupportedActions = (
  actionTypes: ActionType[],
  hasErrorOnCreationCaseAction: boolean
): ActionType[] => {
  return actionTypes.filter((actionType) => {
    if (actionType.id === '.case' && hasErrorOnCreationCaseAction) {
      return false;
    }
    return NOTIFICATION_SUPPORTED_ACTION_TYPES_IDS.includes(actionType.id);
  });
};

export const RuleActionsField: React.FC<Props> = ({
  field,
  hasErrorOnCreationCaseAction,
  messageVariables,
}) => {
  const [fieldErrors, setFieldErrors] = useState<string | null>(null);
  const [supportedActionTypes, setSupportedActionTypes] = useState<ActionType[] | undefined>();
  const form = useFormContext();
  const { isSubmitted, isSubmitting, isValid } = form;
  const {
    http,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [field.setValue, actions]
  );

  const setAlertActionsProperty = useCallback(
    (updatedActions: RuleAction[]) => field.setValue(updatedActions),
    [field]
  );

  const setActionParamsProperty = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: string, value: any, index: number) => {
      const updatedActions = [...actions];
      updatedActions[index] = {
        ...updatedActions[index],
        params: {
          ...updatedActions[index].params,
          [key]: value,
        },
      };
      field.setValue(updatedActions);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [field.setValue, actions]
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
        actionTypes: supportedActionTypes,
        defaultActionMessage: DEFAULT_ACTION_MESSAGE,
      }),
    [
      actions,
      getActionForm,
      messageVariables,
      setActionIdByIndex,
      setActionParamsProperty,
      setAlertActionsProperty,
      supportedActionTypes,
    ]
  );

  useEffect(() => {
    (async function () {
      const actionTypes = convertArrayToCamelCase(await loadActionTypes({ http })) as ActionType[];
      const supportedTypes = getSupportedActions(actionTypes, hasErrorOnCreationCaseAction);
      setSupportedActionTypes(supportedTypes);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasErrorOnCreationCaseAction]);

  useEffect(() => {
    if (isSubmitting || !field.errors.length) {
      return setFieldErrors(null);
    }
    if (isSubmitted && !isSubmitting && isValid === false && field.errors.length) {
      const errorsString = field.errors.map(({ message }) => message).join('\n');
      return setFieldErrors(errorsString);
    }
  }, [isSubmitted, isSubmitting, field.isChangingValue, isValid, field.errors, setFieldErrors]);

  if (!supportedActionTypes) return <></>;

  return (
    <ContainerActions $caseIndexes={caseActionIndexes}>
      {fieldErrors ? (
        <>
          <FieldErrorsContainer>
            <EuiCallOut title={FORM_ERRORS_TITLE} color="danger" iconType="alert">
              <ReactMarkdown source={fieldErrors} />
            </EuiCallOut>
          </FieldErrorsContainer>
          <EuiSpacer />
        </>
      ) : null}
      {actionForm}
    </ContainerActions>
  );
};
