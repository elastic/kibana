/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiAccordionProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiAccordion,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import styled from 'styled-components';

import { pickBy, isEmpty, map } from 'lodash';
import { convertECSMappingToObject } from '../../../common/schemas/common/utils';
import type { FormData } from '../../shared_imports';
import { UseField, Form, useForm, useFormData } from '../../shared_imports';
import { AgentsTableField } from './agents_table_field';
import { LiveQueryQueryField } from './live_query_query_field';
import { useKibana } from '../../common/lib/kibana';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import { SavedQueryFlyout } from '../../saved_queries';
import { useErrorToast } from '../../common/hooks/use_error_toast';
import { ECSMappingEditorField } from '../../packs/queries/lazy_ecs_mapping_editor_field';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { liveQueryFormSchema } from './schema';

const FORM_ID = 'liveQueryForm';

const StyledEuiAccordion = styled(EuiAccordion)`
  ${({ isDisabled }: { isDisabled?: boolean }) => isDisabled && 'display: none;'}
  .euiAccordion__button {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
  }
`;

const GhostFormField = () => <></>;

type FormType = 'simple' | 'steps';

interface LiveQueryFormProps {
  defaultValue?: Partial<FormData>;
  onSuccess?: () => void;
  queryField?: boolean;
  ecsMappingField?: boolean;
  formType?: FormType;
  enabled?: boolean;
  hideAgentsField?: boolean;
  addToTimeline?: (payload: { query: [string, string]; isIcon?: true }) => React.ReactElement;
}

const LiveQueryFormComponent: React.FC<LiveQueryFormProps> = ({
  defaultValue,
  onSuccess,
  queryField = true,
  ecsMappingField = true,
  formType = 'steps',
  enabled = true,
  hideAgentsField = false,
  addToTimeline,
}) => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { http } = useKibana().services;
  const [advancedContentState, setAdvancedContentState] =
    useState<EuiAccordionProps['forceState']>('closed');
  const [showSavedQueryFlyout, setShowSavedQueryFlyout] = useState(false);
  const setErrorToast = useErrorToast();

  const handleShowSaveQueryFlout = useCallback(() => setShowSavedQueryFlyout(true), []);
  const handleCloseSaveQueryFlout = useCallback(() => setShowSavedQueryFlyout(false), []);

  const { data, isLoading, mutateAsync, isError, isSuccess } = useMutation(
    (payload: Record<string, unknown>) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      http.post<any>('/internal/osquery/action', {
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

  const { form } = useForm({
    id: FORM_ID,
    schema: liveQueryFormSchema,
    onSubmit: async (formData, isValid) => {
      if (isValid) {
        try {
          await mutateAsync(pickBy(formData, (value) => !isEmpty(value)));
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    },
    options: {
      stripEmptyFields: false,
    },
    serializer: ({
      savedQueryId,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ecs_mapping,
      ...formData
    }) =>
      pickBy(
        {
          ...formData,
          saved_query_id: savedQueryId,
          ecs_mapping: convertECSMappingToObject(ecs_mapping),
        },
        (value) => !isEmpty(value)
      ),
  });

  const { updateFieldValues, setFieldValue, submit, isSubmitting } = form;

  const actionId = useMemo(() => data?.actions[0].action_id, [data?.actions]);
  const agentIds = useMemo(() => data?.actions[0].agents, [data?.actions]);
  const [{ agentSelection, ecs_mapping: ecsMapping, query, savedQueryId }, formDataSerializer] =
    useFormData({
      form,
    });

  /* recalculate the form data when ecs_mapping changes */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const serializedFormData = useMemo(() => formDataSerializer(), [ecsMapping, formDataSerializer]);

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
    if (isError || !form.getFields().query?.isValid) return 'danger';
    if (isLoading) return 'loading';
    if (isSuccess) return 'complete';

    return 'incomplete';
  }, [isError, isLoading, isSuccess, form]);

  const resultsStatus = useMemo(
    () => (queryStatus === 'complete' ? 'incomplete' : 'disabled'),
    [queryStatus]
  );

  const handleSavedQueryChange = useCallback(
    (savedQuery) => {
      if (savedQuery) {
        updateFieldValues({
          query: savedQuery.query,
          savedQueryId: savedQuery.savedQueryId,
          ecs_mapping: savedQuery.ecs_mapping
            ? map(savedQuery.ecs_mapping, (value, key) => ({
                key,
                result: {
                  type: Object.keys(value)[0],
                  value: Object.values(value)[0],
                },
              }))
            : [],
        });

        if (!isEmpty(savedQuery.ecs_mapping)) {
          setAdvancedContentState('open');
        }
      } else {
        setFieldValue('savedQueryId', null);
      }
    },
    [setFieldValue, updateFieldValues]
  );

  const commands = useMemo(
    () => [
      {
        name: 'submitOnCmdEnter',
        bindKey: { win: 'ctrl+enter', mac: 'cmd+enter' },
        exec: () => submit(),
      },
    ],
    [submit]
  );

  const queryComponentProps = useMemo(
    () => ({
      commands,
    }),
    [commands]
  );

  const flyoutFormDefaultValue = useMemo(
    () => ({ savedQueryId, query, ecs_mapping: serializedFormData.ecs_mapping }),
    [savedQueryId, serializedFormData.ecs_mapping, query]
  );

  const handleToggle = useCallback((isOpen) => {
    const newState = isOpen ? 'open' : 'closed';
    setAdvancedContentState(newState);
  }, []);

  const ecsFieldProps = useMemo(
    () => ({
      isDisabled: !permissions.writeLiveQueries,
    }),
    [permissions.writeLiveQueries]
  );

  const isSavedQueryDisabled = useMemo(
    () => !permissions.runSavedQueries || !permissions.readSavedQueries,
    [permissions.readSavedQueries, permissions.runSavedQueries]
  );

  const queryFieldStepContent = useMemo(
    () => (
      <>
        {queryField ? (
          <>
            {!isSavedQueryDisabled && (
              <>
                <SavedQueriesDropdown
                  disabled={isSavedQueryDisabled}
                  onChange={handleSavedQueryChange}
                />
              </>
            )}
            <UseField path="savedQueryId" component={GhostFormField} />
            <UseField
              path="query"
              component={LiveQueryQueryField}
              componentProps={queryComponentProps}
            />
          </>
        ) : (
          <>
            <UseField path="savedQueryId" component={GhostFormField} />
            <UseField path="query" component={GhostFormField} />
          </>
        )}
        {ecsMappingField ? (
          <>
            <EuiSpacer size="m" />
            <StyledEuiAccordion
              id="advanced"
              forceState={advancedContentState}
              onToggle={handleToggle}
              buttonContent="Advanced"
            >
              <EuiSpacer size="xs" />
              <ECSMappingEditorField euiFieldProps={ecsFieldProps} />
            </StyledEuiAccordion>
          </>
        ) : (
          <UseField path="ecs_mapping" component={GhostFormField} />
        )}
        <EuiSpacer />
        <EuiFlexGroup justifyContent="flexEnd">
          {formType === 'steps' && (
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
            <EuiButton
              id="submit-button"
              disabled={!enabled || !agentSelected || !queryValueProvided || isSubmitting}
              onClick={submit}
            >
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
      queryField,
      queryComponentProps,
      permissions.writeSavedQueries,
      handleSavedQueryChange,
      ecsMappingField,
      advancedContentState,
      handleToggle,
      ecsFieldProps,
      formType,
      agentSelected,
      queryValueProvided,
      resultsStatus,
      handleShowSaveQueryFlout,
      enabled,
      isSubmitting,
      submit,
      isSavedQueryDisabled,
    ]
  );

  const resultsStepContent = useMemo(
    () =>
      actionId ? (
        <ResultTabs
          actionId={actionId}
          endDate={data?.actions[0].expiration}
          agentIds={agentIds}
          addToTimeline={addToTimeline}
        />
      ) : null,
    [actionId, agentIds, data?.actions, addToTimeline]
  );

  useEffect(() => {
    if (defaultValue) {
      updateFieldValues({
        agentSelection: defaultValue.agentSelection,
        query: defaultValue.query,
        savedQueryId: defaultValue.savedQueryId,
        ecs_mapping: defaultValue.ecs_mapping
          ? map(defaultValue.ecs_mapping, (value, key) => ({
              key,
              result: {
                type: Object.keys(value)[0],
                value: Object.values(value)[0],
              },
            }))
          : undefined,
      });
    }
  }, [defaultValue, updateFieldValues]);

  return (
    <>
      <Form form={form}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <UseField
              path="agentSelection"
              component={!hideAgentsField ? AgentsTableField : GhostFormField}
            />
          </EuiFlexItem>
          <EuiFlexItem>{queryFieldStepContent}</EuiFlexItem>
          <EuiFlexItem>{resultsStepContent}</EuiFlexItem>
        </EuiFlexGroup>
      </Form>
      {showSavedQueryFlyout ? (
        <SavedQueryFlyout
          isExternal={!!addToTimeline}
          onClose={handleCloseSaveQueryFlout}
          defaultValue={flyoutFormDefaultValue}
        />
      ) : null}
    </>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);
