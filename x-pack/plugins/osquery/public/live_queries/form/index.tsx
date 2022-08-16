/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiAccordionProps } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiAccordion,
  EuiCard,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useForm as useHookForm, FormProvider, useController } from 'react-hook-form';

import { isEmpty, map, find, pickBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { defaultEcsFormData } from '../../packs/queries/ecs_mapping_editor_field';
import { convertECSMappingToObject } from '../../../common/schemas/common/utils';
import { useKibana } from '../../common/lib/kibana';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import { SavedQueryFlyout } from '../../saved_queries';
import { ECSMappingEditorField } from '../../packs/queries/lazy_ecs_mapping_editor_field';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { usePacks } from '../../packs/use_packs';
import { PackQueriesStatusTable } from './pack_queries_status_table';
import { useCreateLiveQuery } from '../use_create_live_query_action';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import type { AgentSelection } from '../../agents/types';
import { LiveQueryQueryField } from './live_query_query_field';
import { AgentsTableField } from './agents_table_field';
import { PacksComboBoxField } from './packs_combobox_field';

export interface ILiveQueryFormFields {
  query: string;
  agentSelection: AgentSelection;
  savedQueryId?: string | null;
  ecs_mapping: Array<{
    key: string;
    result: {
      type: string;
      value: string;
    };
  }>;
  packId: string[];
}

interface IDefaultLiveQueryFormFields {
  query: string;
  agentSelection: AgentSelection;
  savedQueryId?: string | null;
  ecs_mapping: Record<string, Record<'field', string>>;
  packId: string;
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

  button[role='switch'] {
    left: auto;
    height: 100% !important;
    width: 80px;
    right: 0;
    border-radius: 0 5px 5px 0;

    > span {
      svg {
        width: 18px;
        height: 18px;
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

const StyledEuiAccordion = styled(EuiAccordion)`
  ${({ isDisabled }: { isDisabled?: boolean }) => isDisabled && 'display: none;'}
  .euiAccordion__button {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
  }
`;

type FormType = 'simple' | 'steps';

interface LiveQueryFormProps {
  defaultValue?: IDefaultLiveQueryFormFields;
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
  const hooksForm = useHookForm<ILiveQueryFormFields>({
    defaultValues: {
      ecs_mapping: [defaultEcsFormData],
    },
  });
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    resetField,
    clearErrors,
    getFieldState,
    formState: { isSubmitting, errors },
  } = hooksForm;
  const [queryType, setQueryType] = useState<string>(() =>
    defaultValue?.packId ? 'pack' : 'query'
  );
  const { field: packField, fieldState: packFieldState } = useController({
    control,
    name: 'packId',
    rules: {
      required: { message: 'Pack is a required field', value: queryType === 'pack' },
    },
    defaultValue: [],
  });

  const queryState = getFieldState('query');
  const watchedValues = watch();

  const permissions = useKibana().services.application.capabilities.osquery;
  const [advancedContentState, setAdvancedContentState] =
    useState<EuiAccordionProps['forceState']>('closed');
  const [showSavedQueryFlyout, setShowSavedQueryFlyout] = useState(false);

  const [isLive, setIsLive] = useState(false);

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

  const { ecs_mapping: ecsMapping, query, savedQueryId, packId } = watchedValues;

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

  const onSubmit = useCallback(async () => {
    const serializedData = pickBy(
      {
        agentSelection: watchedValues.agentSelection,
        savedQueryId: watchedValues.savedQueryId,
        query: watchedValues.query,
        pack_id: packId?.length ? packId[0] : undefined,
        ...(watchedValues.ecs_mapping
          ? { ecs_mapping: convertECSMappingToObject(watchedValues.ecs_mapping) }
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
  }, [errors, mutateAsync, packId, watchedValues]);

  const commands = useMemo(
    () => [
      {
        name: 'submitOnCmdEnter',
        bindKey: { win: 'ctrl+enter', mac: 'cmd+enter' },
        exec: () => handleSubmit(onSubmit),
      },
    ],
    [handleSubmit, onSubmit]
  );

  const queryComponentProps = useMemo(
    () => ({
      commands,
    }),
    [commands]
  );

  const flyoutFormDefaultValue = useMemo(
    () => ({ savedQueryId, query, ecs_mapping: convertECSMappingToObject(ecsMapping) }),
    [savedQueryId, ecsMapping, query]
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

  const { data: packsData } = usePacks({});

  const selectedPackData = useMemo(
    () => (packId?.length ? find(packsData?.data, { id: packId[0] }) : null),
    [packId, packsData]
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
            <LiveQueryQueryField name="query" {...queryComponentProps} queryType={queryType} />
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
          ecsMapping={convertECSMappingToObject(ecsMapping)}
          endDate={singleQueryDetails?.expiration}
          agentIds={singleQueryDetails?.agents}
          addToTimeline={addToTimeline}
        />
      ) : null,
    [
      singleQueryDetails?.action_id,
      singleQueryDetails?.expiration,
      singleQueryDetails?.agents,
      ecsMapping,
      addToTimeline,
    ]
  );

  useEffect(() => {
    if (defaultValue) {
      setValue('query', defaultValue.query);
      setValue('agentSelection', defaultValue.agentSelection);
      setValue('savedQueryId', defaultValue.savedQueryId);
      setValue('packId', [defaultValue.packId]);
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
    }
  }, [defaultValue, setValue]);

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

  const canRunPacks = useMemo(
    () =>
      !!((permissions.runSavedQueries || permissions.writeLiveQueries) && permissions.readPacks),
    [permissions]
  );

  useEffect(() => {
    if (defaultValue?.packId) {
      setQueryType('pack');
      const selectedPackOption = find(packsData?.data, ['id', defaultValue.packId]);
      if (selectedPackOption) {
        setValue('packId', [defaultValue.packId]);
      }
    }
  }, [defaultValue, packsData, setValue]);

  useEffect(() => {
    setIsLive(() => !(liveQueryDetails?.status === 'completed'));
  }, [liveQueryDetails?.status]);

  useEffect(() => {
    cleanupLiveQuery();
    if (!defaultValue) {
      resetField('packId');
      resetField('query');
      resetField('ecs_mapping');
      resetField('ecs_mapping');
      // savedQueryId is not a form field
      setValue('savedQueryId', null);
      clearErrors();
    }
  }, [queryType, cleanupLiveQuery, resetField, setValue, clearErrors, defaultValue]);

  return (
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
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <StyledEuiCard
                    layout="horizontal"
                    title={i18n.translate('xpack.osquery.liveQuery.queryForm.packQueryTypeLabel', {
                      defaultMessage: 'Pack',
                    })}
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
            <AgentsTableField name="agentSelection" />
          </EuiFlexItem>
        )}
        {queryType === 'pack' ? (
          <>
            <EuiFlexItem>
              <PacksComboBoxField
                onChange={packField.onChange}
                value={packField.value}
                name={packField.name}
                error={packFieldState.error?.message}
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                fieldProps={{ packsData: packsData?.data }}
              />
            </EuiFlexItem>
            {submitButtonContent}
            <EuiSpacer />

            {liveQueryDetails?.queries?.length || selectedPackData?.attributes?.queries?.length ? (
              <>
                <EuiFlexItem>
                  <PackQueriesStatusTable
                    actionId={actionId}
                    agentIds={agentIds}
                    data={liveQueryDetails?.queries ?? selectedPackData?.attributes?.queries}
                    addToTimeline={addToTimeline}
                  />
                </EuiFlexItem>
              </>
            ) : null}
          </>
        ) : (
          <>
            <EuiFlexItem>{queryFieldStepContent}</EuiFlexItem>
            {submitButtonContent}
            <EuiFlexItem>{resultsStepContent}</EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      {showSavedQueryFlyout ? (
        <SavedQueryFlyout
          isExternal={!!addToTimeline}
          onClose={handleCloseSaveQueryFlyout}
          defaultValue={flyoutFormDefaultValue}
        />
      ) : null}
    </FormProvider>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);
