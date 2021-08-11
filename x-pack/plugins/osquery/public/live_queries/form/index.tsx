/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiSteps,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import deepMerge from 'deepmerge';

import { UseField, Form, FormData, useForm, useFormData, FIELD_TYPES } from '../../shared_imports';
import { AgentsTableField } from './agents_table_field';
import { LiveQueryQueryField } from './live_query_query_field';
import { useKibana } from '../../common/lib/kibana';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import { queryFieldValidation } from '../../common/validations';
import { fieldValidators } from '../../shared_imports';
import { SavedQueryFlyout } from '../../saved_queries';
import { useErrorToast } from '../../common/hooks/use_error_toast';

const FORM_ID = 'liveQueryForm';

export const MAX_QUERY_LENGTH = 2000;

const GhostFormField = () => <></>;

interface LiveQueryFormProps {
  defaultValue?: Partial<FormData> | undefined;
  onSuccess?: () => void;
  singleAgentMode?: boolean;
}

const LiveQueryFormComponent: React.FC<LiveQueryFormProps> = ({
  defaultValue,
  onSuccess,
  singleAgentMode,
}) => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { http } = useKibana().services;
  const [showSavedQueryFlyout, setShowSavedQueryFlyout] = useState(false);
  const setErrorToast = useErrorToast();

  const handleShowSaveQueryFlout = useCallback(() => setShowSavedQueryFlyout(true), []);
  const handleCloseSaveQueryFlout = useCallback(() => setShowSavedQueryFlyout(false), []);

  const { data, isLoading, mutateAsync, isError, isSuccess } = useMutation(
    (payload: Record<string, unknown>) =>
      http.post('/internal/osquery/action', {
        body: JSON.stringify(payload),
      }),
    {
      onSuccess: () => {
        setErrorToast();
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error) => {
        setErrorToast(error);
      },
    }
  );

  const formSchema = {
    query: {
      type: FIELD_TYPES.TEXT,
      validations: [
        {
          validator: fieldValidators.maxLengthField({
            length: MAX_QUERY_LENGTH,
            message: i18n.translate('xpack.osquery.liveQuery.queryForm.largeQueryError', {
              defaultMessage: 'Query is too large (max {maxLength} characters)',
              values: { maxLength: MAX_QUERY_LENGTH },
            }),
          }),
        },
        { validator: queryFieldValidation },
      ],
    },
  };

  const { form } = useForm({
    id: FORM_ID,
    schema: formSchema,
    onSubmit: (payload) => {
      return mutateAsync(payload);
    },
    options: {
      stripEmptyFields: false,
    },
    defaultValue: deepMerge(
      {
        agentSelection: {
          agents: [],
          allAgentsSelected: false,
          platformsSelected: [],
          policiesSelected: [],
        },
        query: '',
      },
      defaultValue ?? {}
    ),
  });

  const { submit } = form;

  const actionId = useMemo(() => data?.actions[0].action_id, [data?.actions]);
  const agentIds = useMemo(() => data?.actions[0].agents, [data?.actions]);
  const [{ agentSelection, query }] = useFormData({ form, watch: ['agentSelection', 'query'] });

  const agentSelected = useMemo(
    () =>
      agentSelection &&
      !!(
        agentSelection.allAgentsSelected ||
        agentSelection.agents?.length ||
        agentSelection.platformsSelected?.length ||
        agentSelection.policiesSelected?.length
      ),
    [agentSelection]
  );

  const queryValueProvided = useMemo(() => !!query?.length, [query]);

  const queryStatus = useMemo(() => {
    if (!agentSelected) return 'disabled';
    if (isError || !form.getFields().query.isValid) return 'danger';
    if (isLoading) return 'loading';
    if (isSuccess) return 'complete';

    return 'incomplete';
  }, [agentSelected, isError, isLoading, isSuccess, form]);

  const resultsStatus = useMemo(() => (queryStatus === 'complete' ? 'incomplete' : 'disabled'), [
    queryStatus,
  ]);

  const queryComponentProps = useMemo(
    () => ({
      disabled: queryStatus === 'disabled',
    }),
    [queryStatus]
  );

  const flyoutFormDefaultValue = useMemo(() => ({ query }), [query]);

  const queryFieldStepContent = useMemo(
    () => (
      <>
        <UseField
          path="query"
          component={LiveQueryQueryField}
          componentProps={queryComponentProps}
        />
        <EuiSpacer />
        <EuiFlexGroup justifyContent="flexEnd">
          {!singleAgentMode && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                disabled={
                  !permissions.writeSavedQueries ||
                  !agentSelected ||
                  !queryValueProvided ||
                  resultsStatus === 'disabled'
                }
                onClick={handleShowSaveQueryFlout}
              >
                <FormattedMessage
                  id="xpack.osquery.liveQueryForm.form.saveForLaterButtonLabel"
                  defaultMessage="Save for later"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButton disabled={!agentSelected || !queryValueProvided} onClick={submit}>
              <FormattedMessage
                id="xpack.osquery.liveQueryForm.form.submitButtonLabel"
                defaultMessage="Submit"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    ),
    [
      agentSelected,
      permissions.writeSavedQueries,
      handleShowSaveQueryFlout,
      queryComponentProps,
      queryValueProvided,
      resultsStatus,
      singleAgentMode,
      submit,
    ]
  );

  const resultsStepContent = useMemo(
    () =>
      actionId ? (
        <ResultTabs actionId={actionId} endDate={data?.actions[0].expiration} agentIds={agentIds} />
      ) : null,
    [actionId, agentIds, data?.actions]
  );

  const formSteps: EuiContainedStepProps[] = useMemo(
    () => [
      {
        title: i18n.translate('xpack.osquery.liveQueryForm.steps.agentsStepHeading', {
          defaultMessage: 'Select agents',
        }),
        children: <UseField path="agentSelection" component={AgentsTableField} />,
        status: agentSelected ? 'complete' : 'incomplete',
      },
      {
        title: i18n.translate('xpack.osquery.liveQueryForm.steps.queryStepHeading', {
          defaultMessage: 'Enter query',
        }),
        children: queryFieldStepContent,
        status: queryStatus,
      },
      {
        title: i18n.translate('xpack.osquery.liveQueryForm.steps.resultsStepHeading', {
          defaultMessage: 'Check results',
        }),
        children: resultsStepContent,
        status: resultsStatus,
      },
    ],
    [agentSelected, queryFieldStepContent, queryStatus, resultsStepContent, resultsStatus]
  );

  const singleAgentForm = useMemo(
    () => (
      <EuiFlexGroup direction="column">
        <UseField path="agentSelection" component={GhostFormField} />
        <EuiFlexItem>{queryFieldStepContent}</EuiFlexItem>
        <EuiFlexItem>{resultsStepContent}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    [queryFieldStepContent, resultsStepContent]
  );

  return (
    <>
      <Form form={form}>{singleAgentMode ? singleAgentForm : <EuiSteps steps={formSteps} />}</Form>
      {showSavedQueryFlyout ? (
        <SavedQueryFlyout
          onClose={handleCloseSaveQueryFlout}
          defaultValue={flyoutFormDefaultValue}
        />
      ) : null}
    </>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);
