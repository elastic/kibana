/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import deepMerge from 'deepmerge';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';

import { NOTIFICATION_SUPPORTED_ACTION_TYPES_IDS } from '../../../../../common/constants';
import { SelectField, useFormContext } from '../../../../shared_imports';
import {
  ActionForm,
  ActionType,
  loadActionTypes,
} from '../../../../../../triggers_actions_ui/public';
import { AlertAction } from '../../../../../../alerts/common';
import { useKibana } from '../../../../common/lib/kibana';
import { FORM_ERRORS_TITLE } from './translations';

type ThrottleSelectField = typeof SelectField;

const DEFAULT_ACTION_GROUP_ID = 'default';
const DEFAULT_ACTION_MESSAGE =
  'Rule {{context.rule.name}} generated {{state.signals_count}} alerts';

const FieldErrorsContainer = styled.div`
  p {
    margin-bottom: 0;
  }
`;

export const RuleActionsField: ThrottleSelectField = ({ field, messageVariables }) => {
  const [fieldErrors, setFieldErrors] = useState<string | null>(null);
  const [supportedActionTypes, setSupportedActionTypes] = useState<ActionType[] | undefined>();
  const form = useFormContext();
  const { isSubmitted, isSubmitting, isValid } = form;
  const {
    http,
    triggers_actions_ui: { actionTypeRegistry },
    notifications,
    docLinks,
    application: { capabilities },
  } = useKibana().services;

  const actions: AlertAction[] = useMemo(
    () => (!isEmpty(field.value) ? (field.value as AlertAction[]) : []),
    [field.value]
  );

  const setActionIdByIndex = useCallback(
    (id: string, index: number) => {
      const updatedActions = [...(actions as Array<Partial<AlertAction>>)];
      updatedActions[index] = deepMerge(updatedActions[index], { id });
      field.setValue(updatedActions);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [field.setValue, actions]
  );

  const setAlertProperty = useCallback(
    (updatedActions: AlertAction[]) => field.setValue(updatedActions),
    [field]
  );

  const setActionParamsProperty = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: string, value: any, index: number) => {
      const updatedActions = [...actions];
      updatedActions[index].params[key] = value;
      field.setValue(updatedActions);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [field.setValue, actions]
  );

  useEffect(() => {
    (async function () {
      const actionTypes = await loadActionTypes({ http });
      const supportedTypes = actionTypes.filter((actionType) =>
        NOTIFICATION_SUPPORTED_ACTION_TYPES_IDS.includes(actionType.id)
      );
      setSupportedActionTypes(supportedTypes);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <>
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
      <ActionForm
        actions={actions}
        docLinks={docLinks}
        capabilities={capabilities}
        messageVariables={messageVariables}
        defaultActionGroupId={DEFAULT_ACTION_GROUP_ID}
        setActionIdByIndex={setActionIdByIndex}
        setAlertProperty={setAlertProperty}
        setActionParamsProperty={setActionParamsProperty}
        http={http}
        actionTypeRegistry={actionTypeRegistry}
        actionTypes={supportedActionTypes}
        defaultActionMessage={DEFAULT_ACTION_MESSAGE}
        toastNotifications={notifications.toasts}
      />
    </>
  );
};
