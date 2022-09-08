/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useForm as useHookForm, FormProvider } from 'react-hook-form';
import { isEmpty, map, find, pickBy } from 'lodash';
import { i18n } from '@kbn/i18n';

import type { SavedQuerySOFormData } from '../../saved_queries/form/use_saved_query_form';
import type {
  EcsMappingFormField,
  EcsMappingSerialized,
} from '../../packs/queries/ecs_mapping_editor_field';
import { defaultEcsFormData } from '../../packs/queries/ecs_mapping_editor_field';
import { convertECSMappingToObject } from '../../../common/schemas/common/utils';
import { useKibana } from '../../common/lib/kibana';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import { SavedQueryFlyout } from '../../saved_queries';
import { usePacks } from '../../packs/use_packs';
import { PackQueriesStatusTable } from './pack_queries_status_table';
import { useCreateLiveQuery } from '../use_create_live_query_action';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import type { AgentSelection } from '../../agents/types';
import { LiveQueryQueryField } from './live_query_query_field';
import { AgentsTableField } from './agents_table_field';
import { PacksComboBoxField } from './packs_combobox_field';
import { savedQueryDataSerializer } from '../../saved_queries/form/use_saved_query_form';

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
  ecs_mapping?: EcsMappingSerialized;
  packId?: string;
}

const StyledEuiCard = styled(EuiCard)`
  padding: 16px 92px 16px 16px !important;

  .euiTitle {
    font-size: 1rem;
  }

  .euiText {
    margin-top: 0;
    color: ${(props) => props.theme.eui.euiTextSubduedColor};
  }

  > button[role='switch'] {
    left: auto;
    height: 100% !important;
    width: 80px;
    right: 0;
    border-radius: 0 5px 5px 0;

    > span {
      > svg {
        width: 18px;
        height: 18px;
        display: inline-block !important;
      }

      // hide the label
      > :not(svg) {
        display: none;
      }
    }
  }

  button[aria-checked='false'] > span > svg {
    display: none;
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

  const actionId = useMemo(() => liveQueryDetails?.action_id, [liveQueryDetails?.action_id]);
  const agentIds = useMemo(() => liveQueryDetails?.agents, [liveQueryDetails?.agents]);

  useEffect(() => {
    register('savedQueryId');
  }, [register]);

  const { packId } = watchedValues;

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

  const onSubmit = useCallback(
    async (values: LiveQueryFormFields) => {
      const serializedData = pickBy(
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
      if (isEmpty(errors)) {
        try {
          // @ts-expect-error update types
          await mutateAsync(serializedData);
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    },
    [errors, mutateAsync]
  );

  const serializedData: SavedQuerySOFormData = useMemo(
    () => savedQueryDataSerializer(watchedValues),
    [watchedValues]
  );

  const { data: packsData, isFetched: isPackDataFetched } = usePacks({});

  const selectedPackData = useMemo(
    () => (packId?.length ? find(packsData?.data, { id: packId[0] }) : null),
    [packId, packsData]
  );

  const handleSubmitForm = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit]);

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
              onClick={handleSubmitForm}
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
      handleSubmitForm,
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
            ? map(defaultValue.ecs_mapping, (value, key) => ({
                key,
                result: {
                  type: Object.keys(value)[0],
                  value: Object.values(value)[0],
                },
              }))
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

  const queryCardSelectable = useMemo(
    () => ({
      onClick: () => setQueryType('query'),
      isSelected: queryType === 'query',
      iconType: 'check',
    }),
    [queryType]
  );

  const packCardSelectable = useMemo(
    () => ({
      onClick: () => setQueryType('pack'),
      isSelected: queryType === 'pack',
      iconType: 'check',
    }),
    [queryType]
  );

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
            <EuiFlexItem>
              <EuiFormRow label="Query type" fullWidth>
                <EuiFlexGroup gutterSize="m">
                  <EuiFlexItem>
                    <StyledEuiCard
                      layout="horizontal"
                      title={i18n.translate(
                        'xpack.osquery.liveQuery.queryForm.singleQueryTypeLabel',
                        {
                          defaultMessage: 'Single query',
                        }
                      )}
                      titleSize="xs"
                      hasBorder
                      description={i18n.translate(
                        'xpack.osquery.liveQuery.queryForm.singleQueryTypeDescription',
                        {
                          defaultMessage: 'Run a saved query or new one.',
                        }
                      )}
                      selectable={queryCardSelectable}
                      isDisabled={!canRunSingleQuery}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <StyledEuiCard
                      layout="horizontal"
                      title={i18n.translate(
                        'xpack.osquery.liveQuery.queryForm.packQueryTypeLabel',
                        {
                          defaultMessage: 'Pack',
                        }
                      )}
                      titleSize="xs"
                      hasBorder
                      description={i18n.translate(
                        'xpack.osquery.liveQuery.queryForm.packQueryTypeDescription',
                        {
                          defaultMessage: 'Run a set of queries in a pack.',
                        }
                      )}
                      selectable={packCardSelectable}
                      isDisabled={!canRunPacks}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            </EuiFlexItem>
          )}
          {!hideAgentsField && (
            <EuiFlexItem>
              <AgentsTableField />
            </EuiFlexItem>
          )}
          {queryType === 'pack' ? (
            <>
              <EuiFlexItem>
                <PacksComboBoxField
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  fieldProps={{ packsData: packsData?.data }}
                  queryType={queryType}
                />
              </EuiFlexItem>
              {submitButtonContent}
              <EuiSpacer />

              {liveQueryDetails?.queries?.length ||
              selectedPackData?.attributes?.queries?.length ? (
                <>
                  <EuiFlexItem>
                    <PackQueriesStatusTable
                      actionId={actionId}
                      agentIds={agentIds}
                      // @ts-expect-error version string !+ string[]
                      data={liveQueryDetails?.queries ?? selectedPackData?.attributes?.queries}
                      addToTimeline={addToTimeline}
                    />
                  </EuiFlexItem>
                </>
              ) : null}
            </>
          ) : (
            <>
              <EuiFlexItem>
                <LiveQueryQueryField handleSubmitForm={handleSubmitForm} />
              </EuiFlexItem>
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
