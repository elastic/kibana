/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm as useHookForm, FormProvider } from 'react-hook-form';
import { isEmpty, find, pickBy } from 'lodash';

import { PLUGIN_NAME as OSQUERY_PLUGIN_NAME } from '../../../common';
import { QueryPackSelectable } from './query_pack_selectable';
import type { SavedQuerySOFormData } from '../../saved_queries/form/use_saved_query_form';
import { useKibana } from '../../common/lib/kibana';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import { SavedQueryFlyout } from '../../saved_queries';
import { usePacks } from '../../packs/use_packs';
import { useCreateLiveQuery } from '../use_create_live_query_action';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import type { AgentSelection } from '../../agents/types';
import { LiveQueryQueryField } from './live_query_query_field';
import { AgentsTableField } from './agents_table_field';
import { savedQueryDataSerializer } from '../../saved_queries/form/use_saved_query_form';
import { PackFieldWrapper } from '../../shared_components/osquery_response_action_type/pack_field_wrapper';

export interface LiveQueryFormFields {
  alertIds?: string[];
  query?: string;
  agentSelection: AgentSelection;
  savedQueryId?: string | null;
  ecs_mapping: ECSMapping;
  packId: string[];
  queryType: 'query' | 'pack';
}

interface DefaultLiveQueryFormFields {
  query?: string;
  agentSelection?: AgentSelection;
  alertIds?: string[];
  savedQueryId?: string | null;
  ecs_mapping?: ECSMapping;
  packId?: string;
}

type FormType = 'simple' | 'steps';

interface LiveQueryFormProps {
  defaultValue?: DefaultLiveQueryFormFields;
  onSuccess?: () => void;
  queryField?: boolean;
  ecsMappingField?: boolean;
  formType?: FormType;
  enabled?: boolean;
  hideAgentsField?: boolean;
}

const LiveQueryFormComponent: React.FC<LiveQueryFormProps> = ({
  defaultValue,
  onSuccess,
  queryField = true,
  formType = 'steps',
  enabled = true,
  hideAgentsField = false,
}) => {
  const { application, appName } = useKibana().services;
  const permissions = application.capabilities.osquery;
  const canRunPacks = useMemo(
    () =>
      !!((permissions.runSavedQueries || permissions.writeLiveQueries) && permissions.readPacks),
    [permissions]
  );

  const hooksForm = useHookForm<LiveQueryFormFields>();
  const {
    handleSubmit,
    watch,
    setValue,
    resetField,
    clearErrors,
    getFieldState,
    register,
    formState: { isSubmitting },
  } = hooksForm;

  const canRunSingleQuery = useMemo(
    () =>
      !!(
        permissions.writeLiveQueries ||
        (permissions.runSavedQueries && permissions.readSavedQueries)
      ),
    [permissions]
  );

  const [showSavedQueryFlyout, setShowSavedQueryFlyout] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const queryState = getFieldState('query');
  const watchedValues = watch();
  const handleShowSaveQueryFlyout = useCallback(() => setShowSavedQueryFlyout(true), []);
  const handleCloseSaveQueryFlyout = useCallback(() => setShowSavedQueryFlyout(false), []);

  const { queryType } = watchedValues;
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
    register('alertIds');
  }, [register]);

  const queryStatus = useMemo(() => {
    if (isError || queryState.error) return 'danger';
    if (isLoading) return 'loading';
    if (isSuccess) return 'complete';

    return 'incomplete';
  }, [isError, isLoading, isSuccess, queryState]);

  const resultsStatus = useMemo(
    () => (queryStatus === 'complete' ? 'incomplete' : 'disabled'),
    [queryStatus]
  );

  const onSubmit = useCallback(
    async (values: LiveQueryFormFields) => {
      const serializedData = pickBy(
        {
          agentSelection: values.agentSelection,
          saved_query_id: values.savedQueryId,
          query: values.query,
          alert_ids: values.alertIds,
          pack_id: values?.packId?.length ? values?.packId[0] : undefined,
          ecs_mapping: values.ecs_mapping,
        },
        (value) => !isEmpty(value)
      ) as unknown as LiveQueryFormFields;

      await mutateAsync(serializedData);
    },
    [mutateAsync]
  );

  const serializedData: SavedQuerySOFormData = useMemo(
    () => savedQueryDataSerializer(watchedValues),
    [watchedValues]
  );

  const { data: packsData, isFetched: isPackDataFetched } = usePacks({});

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
              disabled={!enabled}
              isLoading={isSubmitting}
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

  const singleQueryDetails = useMemo(() => liveQueryDetails?.queries?.[0], [liveQueryDetails]);
  const liveQueryActionId = useMemo(() => liveQueryDetails?.action_id, [liveQueryDetails]);

  const resultsStepContent = useMemo(
    () =>
      singleQueryDetails?.action_id ? (
        <ResultTabs
          actionId={singleQueryDetails?.action_id}
          ecsMapping={serializedData.ecs_mapping}
          endDate={singleQueryDetails?.expiration}
          agentIds={singleQueryDetails?.agents}
          liveQueryActionId={liveQueryActionId}
        />
      ) : null,
    [
      singleQueryDetails?.action_id,
      singleQueryDetails?.expiration,
      singleQueryDetails?.agents,
      serializedData.ecs_mapping,
      liveQueryActionId,
    ]
  );

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.agentSelection) {
        setValue('agentSelection', defaultValue.agentSelection);
      }

      if (defaultValue?.alertIds?.length) {
        setValue('alertIds', defaultValue.alertIds);
      }

      if (defaultValue?.packId && canRunPacks) {
        setValue('queryType', 'pack');

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
        setValue('ecs_mapping', defaultValue.ecs_mapping ?? {});

        return;
      }

      if (canRunSingleQuery) {
        return setValue('queryType', 'query');
      }

      if (canRunPacks) {
        return setValue('queryType', 'pack');
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
      resetField('alertIds');
      clearErrors();
    }
  }, [queryType, cleanupLiveQuery, resetField, setValue, clearErrors, defaultValue]);

  const groupStyles = useMemo(() => ({ gap: 16 }), []);

  return (
    <>
      <FormProvider {...hooksForm}>
        <EuiFlexGroup direction="column" css={groupStyles}>
          {queryField && (
            <QueryPackSelectable canRunPacks={canRunPacks} canRunSingleQuery={canRunSingleQuery} />
          )}
          {!hideAgentsField && (
            <EuiFlexItem>
              <AgentsTableField />
            </EuiFlexItem>
          )}
          {queryType === 'pack' ? (
            <PackFieldWrapper
              liveQueryDetails={liveQueryDetails}
              submitButtonContent={submitButtonContent}
              showResultsHeader
            />
          ) : (
            <>
              <EuiFlexItem>
                <LiveQueryQueryField handleSubmitForm={handleSubmit(onSubmit)} />
              </EuiFlexItem>
              {submitButtonContent}
              <EuiFlexItem>{resultsStepContent}</EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </FormProvider>

      {showSavedQueryFlyout ? (
        <SavedQueryFlyout
          isExternal={appName !== OSQUERY_PLUGIN_NAME}
          onClose={handleCloseSaveQueryFlyout}
          defaultValue={serializedData}
        />
      ) : null}
    </>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);
