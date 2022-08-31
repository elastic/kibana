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
import styled from 'styled-components';
import { useForm as useHookForm, FormProvider } from 'react-hook-form';

import { isEmpty, map, find, pickBy } from 'lodash';
import { QueryPackSelectable } from './QueryPackSelectable';
import type { ECSMapping } from '../../../common/schemas/common';
import type { SavedQuerySOFormData } from '../../saved_queries/form/use_saved_query_form';
import type { EcsMappingFormField } from '../../packs/queries/ecs_mapping_editor_field';
import { defaultEcsFormData } from '../../packs/queries/ecs_mapping_editor_field';
import { convertECSMappingToObject } from '../../../common/schemas/common/utils';
import { useKibana } from '../../common/lib/kibana';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import { SavedQueryFlyout } from '../../saved_queries';
import { ECSMappingEditorField } from '../../packs/queries/lazy_ecs_mapping_editor_field';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { usePacks } from '../../packs/use_packs';
import { useCreateLiveQuery } from '../use_create_live_query_action';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import type { AgentSelection } from '../../agents/types';
import { LiveQueryQueryField } from './live_query_query_field';
import { AgentsTableField } from './agents_table_field';
import { savedQueryDataSerializer } from '../../saved_queries/form/use_saved_query_form';
import { PackFieldWrapper } from '../../shared_components/osquery_response_action_type/pack_field_wrapper';

export interface LiveQueryFormFields {
  query?: string;
  agentSelection: AgentSelection;
  savedQueryId?: string | null;
  ecs_mapping: EcsMappingFormField[];
  packId: string[];
}

interface DefaultLiveQueryFormFields {
  query?: string;
  agentSelection?: AgentSelection;
  savedQueryId?: string | null;
  ecs_mapping?: ECSMapping;
  packId?: string;
}

const StyledEuiAccordion = styled(EuiAccordion)`
  ${({ isDisabled }: { isDisabled?: boolean }) => isDisabled && 'display: none;'}
  .euiAccordion__button {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
  }
`;

type FormType = 'simple' | 'steps';

interface LiveQueryFormProps {
  defaultValue?: DefaultLiveQueryFormFields;
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
  const canRunPacks = useMemo(
    () =>
      !!((permissions.runSavedQueries || permissions.writeLiveQueries) && permissions.readPacks),
    [permissions]
  );

  const hooksForm = useHookForm<LiveQueryFormFields>({
    defaultValues: {
      ecs_mapping: [defaultEcsFormData],
    },
  });
  const {
    handleSubmit,
    watch,
    setValue,
    resetField,
    clearErrors,
    getFieldState,
    register,
    formState: { isSubmitting, errors },
  } = hooksForm;

  const canRunSingleQuery = useMemo(
    () =>
      !!(
        permissions.writeLiveQueries ||
        (permissions.runSavedQueries && permissions.readSavedQueries)
      ),
    [permissions]
  );

  const [advancedContentState, setAdvancedContentState] =
    useState<EuiAccordionProps['forceState']>('closed');
  const [showSavedQueryFlyout, setShowSavedQueryFlyout] = useState(false);
  const [queryType, setQueryType] = useState<string>('query');
  const [isLive, setIsLive] = useState(false);

  const queryState = getFieldState('query');
  const watchedValues = watch();
  const handleShowSaveQueryFlyout = useCallback(() => setShowSavedQueryFlyout(true), []);
  const handleCloseSaveQueryFlyout = useCallback(() => setShowSavedQueryFlyout(false), []);

  const {
    data,
    isLoading,
    mutateAsync,
    isError,
    isSuccess,
    reset: cleanupLiveQuery,
  } = useCreateLiveQuery({ onSuccess });

  const { data: liveQueryDetails } = useLiveQueryDetails({
    actionId: data?.action_id,
    isLive,
  });

  useEffect(() => {
    register('savedQueryId');
  }, [register]);

  const queryStatus = useMemo(() => {
    if (isError || queryState.invalid) return 'danger';
    if (isLoading) return 'loading';
    if (isSuccess) return 'complete';

    return 'incomplete';
  }, [isError, isLoading, isSuccess, queryState]);

  const resultsStatus = useMemo(
    () => (queryStatus === 'complete' ? 'incomplete' : 'disabled'),
    [queryStatus]
  );

  const handleSavedQueryChange = useCallback(
    (savedQuery) => {
      if (savedQuery) {
        setValue('query', savedQuery.query);
        setValue('savedQueryId', savedQuery.savedQueryId);
        setValue(
          'ecs_mapping',
          !isEmpty(savedQuery.ecs_mapping)
            ? map(savedQuery.ecs_mapping, (value, key) => ({
                key,
                result: {
                  type: Object.keys(value)[0],
                  value: Object.values(value)[0] as string,
                },
              }))
            : [defaultEcsFormData]
        );

        if (!isEmpty(savedQuery.ecs_mapping)) {
          setAdvancedContentState('open');
        }
      } else {
        setValue('savedQueryId', null);
      }
    },
    [setValue]
  );

  const onSubmit = useCallback(
    // not sure why, but submitOnCmdEnter doesn't have proper form values so I am passing them in manually
    async (values: LiveQueryFormFields = watchedValues) => {
      const serializedData = liveQueryFormSerializer(values);
      if (isEmpty(errors)) {
        try {
          // @ts-expect-error update types
          await mutateAsync(serializedData);
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    },
    [errors, mutateAsync, watchedValues]
  );
  const commands = useMemo(
    () => [
      {
        name: 'submitOnCmdEnter',
        bindKey: { win: 'ctrl+enter', mac: 'cmd+enter' },
        // @ts-expect-error update types - explanation in onSubmit()
        exec: () => handleSubmit(onSubmit)(watchedValues),
      },
    ],
    [handleSubmit, onSubmit, watchedValues]
  );

  const queryComponentProps = useMemo(
    () => ({
      commands,
    }),
    [commands]
  );

  const serializedData: SavedQuerySOFormData = useMemo(
    () => savedQueryDataSerializer(watchedValues),
    [watchedValues]
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

  const { data: packsData, isFetched: isPackDataFetched } = usePacks({});

  const liveQueryFormSerializer = (values: LiveQueryFormFields) =>
    pickBy(
      {
        agentSelection: values.agentSelection,
        saved_query_id: values.savedQueryId,
        query: values.query,
        pack_id: values?.packId?.length ? values?.packId[0] : undefined,
        ...(values.ecs_mapping
          ? { ecs_mapping: convertECSMappingToObject(values.ecs_mapping) }
          : {}),
      },
      (value) => !isEmpty(value)
    );

  const submitButtonContent = useMemo(
    () => (
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd">
          {formType === 'steps' && queryType !== 'pack' && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                disabled={!permissions.writeSavedQueries || resultsStatus === 'disabled'}
                onClick={handleShowSaveQueryFlyout}
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
              disabled={!enabled || isSubmitting}
              onClick={handleSubmit(onSubmit)}
            >
              <FormattedMessage
                id="xpack.osquery.liveQueryForm.form.submitButtonLabel"
                defaultMessage="Submit"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ),
    [
      formType,
      queryType,
      permissions.writeSavedQueries,
      resultsStatus,
      handleShowSaveQueryFlyout,
      enabled,
      isSubmitting,
      handleSubmit,
      onSubmit,
    ]
  );

  const queryFieldStepContent = useMemo(
    () => (
      <>
        {queryField && (
          <>
            {!isSavedQueryDisabled && (
              <>
                <SavedQueriesDropdown
                  disabled={isSavedQueryDisabled}
                  onChange={handleSavedQueryChange}
                />
              </>
            )}
            <LiveQueryQueryField {...queryComponentProps} queryType={queryType} />
          </>
        )}
        {ecsMappingField && (
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
        )}
      </>
    ),
    [
      queryField,
      isSavedQueryDisabled,
      handleSavedQueryChange,
      queryComponentProps,
      queryType,
      ecsMappingField,
      advancedContentState,
      handleToggle,
      ecsFieldProps,
    ]
  );

  const singleQueryDetails = useMemo(() => liveQueryDetails?.queries?.[0], [liveQueryDetails]);

  const resultsStepContent = useMemo(
    () =>
      singleQueryDetails?.action_id ? (
        <ResultTabs
          actionId={singleQueryDetails?.action_id}
          ecsMapping={serializedData.ecs_mapping}
          endDate={singleQueryDetails?.expiration}
          agentIds={singleQueryDetails?.agents}
          addToTimeline={addToTimeline}
        />
      ) : null,
    [
      singleQueryDetails?.action_id,
      singleQueryDetails?.expiration,
      singleQueryDetails?.agents,
      serializedData.ecs_mapping,
      addToTimeline,
    ]
  );

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.agentSelection) {
        setValue('agentSelection', defaultValue.agentSelection);
      }

      if (defaultValue?.packId && canRunPacks) {
        setQueryType('pack');

        if (!isPackDataFetched) return;
        const selectedPackOption = find(packsData?.data, ['id', defaultValue.packId]);
        if (selectedPackOption) {
          setValue('packId', [defaultValue.packId]);
        }

        return;
      }

      if (defaultValue?.query && canRunSingleQuery) {
        setValue('query', defaultValue.query);
        setValue('savedQueryId', defaultValue.savedQueryId);
        setValue(
          'ecs_mapping',
          !isEmpty(defaultValue.ecs_mapping)
            ? (map(defaultValue.ecs_mapping, (value, key) => ({
                key,
                result: {
                  type: Object.keys(value)[0],
                  value: Object.values(value)[0],
                },
              })) as unknown as EcsMappingFormField[])
            : [defaultEcsFormData]
        );

        return;
      }

      if (canRunSingleQuery) {
        return setQueryType('query');
      }

      if (canRunPacks) {
        return setQueryType('pack');
      }
    }
  }, [canRunPacks, canRunSingleQuery, defaultValue, isPackDataFetched, packsData?.data, setValue]);

  useEffect(() => {
    setIsLive(() => !(liveQueryDetails?.status === 'completed'));
  }, [liveQueryDetails?.status]);

  useEffect(() => {
    cleanupLiveQuery();
    if (!defaultValue) {
      resetField('packId');
      resetField('query');
      resetField('ecs_mapping');
      resetField('savedQueryId');
      clearErrors();
    }
  }, [queryType, cleanupLiveQuery, resetField, setValue, clearErrors, defaultValue]);

  return (
    <>
      <FormProvider {...hooksForm}>
        <EuiFlexGroup direction="column">
          {queryField && (
            <QueryPackSelectable
              queryType={queryType}
              setQueryType={setQueryType}
              canRunPacks={canRunPacks}
              canRunSingleQuery={canRunSingleQuery}
            />
          )}
          {!hideAgentsField && (
            <EuiFlexItem>
              <AgentsTableField />
            </EuiFlexItem>
          )}
          {queryType === 'pack' ? (
            <PackFieldWrapper
              liveQueryDetails={liveQueryDetails}
              addToTimeline={addToTimeline}
              submitButtonContent={submitButtonContent}
            />
          ) : (
            <>
              <EuiFlexItem>{queryFieldStepContent}</EuiFlexItem>
              {submitButtonContent}
              <EuiFlexItem>{resultsStepContent}</EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </FormProvider>

      {showSavedQueryFlyout ? (
        <SavedQueryFlyout
          isExternal={!!addToTimeline}
          onClose={handleCloseSaveQueryFlyout}
          defaultValue={serializedData}
        />
      ) : null}
    </>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);
