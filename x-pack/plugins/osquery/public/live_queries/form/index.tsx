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
  EuiAccordion,
  EuiAccordionProps,
} from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useMutation } from 'react-query';
import deepMerge from 'deepmerge';
import styled from 'styled-components';

import { pickBy, isEmpty } from 'lodash';
import { UseField, Form, FormData, useForm, useFormData, FIELD_TYPES } from '../../shared_imports';
import { AgentsTableField } from './agents_table_field';
import { LiveQueryQueryField } from './live_query_query_field';
import { useKibana } from '../../common/lib/kibana';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import { queryFieldValidation } from '../../common/validations';
import { fieldValidators } from '../../shared_imports';
import { SavedQueryFlyout } from '../../saved_queries';
import { useErrorToast } from '../../common/hooks/use_error_toast';
import {
  ECSMappingEditorField,
  ECSMappingEditorFieldRef,
} from '../../packs/queries/lazy_ecs_mapping_editor_field';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';

const FORM_ID = 'liveQueryForm';

const StyledEuiAccordion = styled(EuiAccordion)`
  ${({ isDisabled }: { isDisabled: boolean }) => isDisabled && 'display: none;'}
  .euiAccordion__button {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
  }
`;

export const MAX_QUERY_LENGTH = 2000;

const GhostFormField = () => <></>;

type FormType = 'simple' | 'steps';

interface LiveQueryFormProps {
  defaultValue?: Partial<FormData> | undefined;
  onSuccess?: () => void;
  agentsField?: boolean;
  queryField?: boolean;
  ecsMappingField?: boolean;
  formType?: FormType;
  enabled?: boolean;
  hideFullscreen?: true;
}

const LiveQueryFormComponent: React.FC<LiveQueryFormProps> = ({
  defaultValue,
  onSuccess,
  agentsField = true,
  queryField = true,
  ecsMappingField = true,
  formType = 'steps',
  enabled = true,
  hideFullscreen,
}) => {
  const ecsFieldRef = useRef<ECSMappingEditorFieldRef>();
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

  const formSchema = {
    agentSelection: {
      defaultValue: {
        agents: [],
        allAgentsSelected: false,
        platformsSelected: [],
        policiesSelected: [],
      },
      type: FIELD_TYPES.JSON,
      validations: [],
    },
    savedQueryId: {
      type: FIELD_TYPES.TEXT,
      validations: [],
    },
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
    ecs_mapping: {
      defaultValue: {},
      type: FIELD_TYPES.JSON,
      validations: [],
    },
  };

  const { form } = useForm({
    id: FORM_ID,
    schema: formSchema,
    onSubmit: async (formData, isValid) => {
      const ecsFieldValue = await ecsFieldRef?.current?.validate();

      if (isValid && !!ecsFieldValue) {
        try {
          await mutateAsync(
            pickBy(
              {
                ...formData,
                ...(isEmpty(ecsFieldValue) ? {} : { ecs_mapping: ecsFieldValue }),
              },
              (value) => !isEmpty(value)
            )
          );
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    },
    options: {
      stripEmptyFields: false,
    },
    serializer: ({ savedQueryId, ...formData }) =>
      pickBy({ ...formData, saved_query_id: savedQueryId }, (value) => !isEmpty(value)),
    defaultValue: deepMerge(
      {
        agentSelection: {
          agents: [],
          allAgentsSelected: false,
          platformsSelected: [],
          policiesSelected: [],
        },
        query: '',
        savedQueryId: null,
      },
      defaultValue ?? {}
    ),
  });

  const { setFieldValue, submit, isSubmitting } = form;

  const actionId = useMemo(() => data?.actions[0].action_id, [data?.actions]);
  const agentIds = useMemo(() => data?.actions[0].agents, [data?.actions]);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const [{ agentSelection, ecs_mapping, query, savedQueryId }] = useFormData({
    form,
    watch: ['agentSelection', 'ecs_mapping', 'query', 'savedQueryId'],
  });

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

  const resultsStatus = useMemo(
    () => (queryStatus === 'complete' ? 'incomplete' : 'disabled'),
    [queryStatus]
  );

  const handleSavedQueryChange = useCallback(
    (savedQuery) => {
      if (savedQuery) {
        setFieldValue('query', savedQuery.query);
        setFieldValue('savedQueryId', savedQuery.savedQueryId);
        if (!isEmpty(savedQuery.ecs_mapping)) {
          setFieldValue('ecs_mapping', savedQuery.ecs_mapping);
          setAdvancedContentState('open');
        } else {
          setFieldValue('ecs_mapping', {});
        }
      } else {
        setFieldValue('savedQueryId', null);
      }
    },
    [setFieldValue]
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
      disabled: queryStatus === 'disabled',
      commands,
    }),
    [queryStatus, commands]
  );

  const flyoutFormDefaultValue = useMemo(
    () => ({ savedQueryId, query, ecs_mapping }),
    [savedQueryId, ecs_mapping, query]
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
    () =>
      queryComponentProps.disabled || !permissions.runSavedQueries || !permissions.readSavedQueries,
    [permissions.readSavedQueries, permissions.runSavedQueries, queryComponentProps.disabled]
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
                <EuiSpacer />
              </>
            )}
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
              isDisabled={queryComponentProps.disabled}
            >
              <EuiSpacer size="xs" />
              <UseField
                path="ecs_mapping"
                component={ECSMappingEditorField}
                query={query}
                fieldRef={ecsFieldRef}
                euiFieldProps={ecsFieldProps}
              />
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
      query,
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
          hideFullscreen={hideFullscreen}
        />
      ) : null,
    [actionId, agentIds, data?.actions, hideFullscreen]
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

  const simpleForm = useMemo(
    () => (
      <EuiFlexGroup direction="column">
        <UseField
          path="agentSelection"
          component={agentsField ? AgentsTableField : GhostFormField}
        />
        <EuiFlexItem>{queryFieldStepContent}</EuiFlexItem>
        <EuiFlexItem>{resultsStepContent}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    [agentsField, queryFieldStepContent, resultsStepContent]
  );

  useEffect(() => {
    if (defaultValue?.agentSelection) {
      setFieldValue('agentSelection', defaultValue?.agentSelection);
    }
    if (defaultValue?.query) {
      setFieldValue('query', defaultValue?.query);
    }
    // TODO: Set query and ECS mapping from savedQueryId object
    if (defaultValue?.savedQueryId) {
      setFieldValue('savedQueryId', defaultValue?.savedQueryId);
    }
    if (!isEmpty(defaultValue?.ecs_mapping)) {
      setFieldValue('ecs_mapping', defaultValue?.ecs_mapping);
    }
  }, [defaultValue, setFieldValue]);

  return (
    <>
      <Form form={form}>
        {formType === 'steps' ? <EuiSteps steps={formSteps} /> : simpleForm}
        <UseField path="savedQueryId" component={GhostFormField} />
      </Form>
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
