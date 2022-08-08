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

import { pickBy, isEmpty, map, find } from 'lodash';
import { i18n } from '@kbn/i18n';
import { convertECSMappingToObject } from '../../../common/schemas/common/utils';
import type { FormData } from '../../shared_imports';
import { UseField, Form, useForm, useFormData } from '../../shared_imports';
import { AgentsTableField } from './agents_table_field';
import { LiveQueryQueryField } from './live_query_query_field';
import { useKibana } from '../../common/lib/kibana';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import { SavedQueryFlyout } from '../../saved_queries';
import { ECSMappingEditorField } from '../../packs/queries/lazy_ecs_mapping_editor_field';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { liveQueryFormSchema } from './schema';
import { usePacks } from '../../packs/use_packs';
import { PackQueriesStatusTable } from './pack_queries_status_table';
import { useCreateLiveQuery } from '../use_create_live_query_action';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import { PacksComboBoxField } from './packs_combobox_field';

const FORM_ID = 'liveQueryForm';

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
  const canRunPacks = useMemo(
    () =>
      !!((permissions.runSavedQueries || permissions.writeLiveQueries) && permissions.readPacks),
    [permissions]
  );

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

  const { form } = useForm({
    id: FORM_ID,
    schema: liveQueryFormSchema,
    onSubmit: async (formData, isValid) => {
      if (isValid) {
        try {
          // @ts-expect-error update types
          await mutateAsync(formData);
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
      packId,
      ...formData
    }) =>
      pickBy(
        {
          ...formData,
          pack_id: packId?.length ? packId[0] : undefined,
          saved_query_id: savedQueryId,
          ecs_mapping: convertECSMappingToObject(ecs_mapping),
        },
        (value) => !isEmpty(value)
      ),
  });

  const { updateFieldValues, setFieldValue, submit, isSubmitting } = form;

  const actionId = useMemo(() => liveQueryDetails?.action_id, [liveQueryDetails?.action_id]);
  const agentIds = useMemo(() => liveQueryDetails?.agents, [liveQueryDetails?.agents]);
  const [
    { agentSelection, ecs_mapping: ecsMapping, query, savedQueryId, packId },
    formDataSerializer,
  ] = useFormData({
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

  const { data: packsData, isFetched: isPackDataFetched } = usePacks({});

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
                disabled={
                  !permissions.writeSavedQueries ||
                  !agentSelected ||
                  !queryValueProvided ||
                  resultsStatus === 'disabled'
                }
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
              disabled={
                !enabled ||
                !agentSelected ||
                (queryType === 'query' && !queryValueProvided) ||
                (queryType === 'pack' &&
                  (!packId || !selectedPackData?.attributes.queries.length)) ||
                isSubmitting
              }
              onClick={submit}
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
      agentSelected,
      enabled,
      formType,
      handleShowSaveQueryFlyout,
      isSubmitting,
      packId,
      permissions.writeSavedQueries,
      queryType,
      queryValueProvided,
      resultsStatus,
      selectedPackData,
      submit,
    ]
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
      </>
    ),
    [
      queryField,
      queryComponentProps,
      handleSavedQueryChange,
      ecsMappingField,
      advancedContentState,
      handleToggle,
      ecsFieldProps,
      isSavedQueryDisabled,
    ]
  );

  const singleQueryDetails = useMemo(() => liveQueryDetails?.queries?.[0], [liveQueryDetails]);

  const resultsStepContent = useMemo(
    () =>
      singleQueryDetails?.action_id ? (
        <ResultTabs
          actionId={singleQueryDetails?.action_id}
          ecsMapping={serializedFormData.ecs_mapping}
          endDate={singleQueryDetails?.expiration}
          agentIds={singleQueryDetails?.agents}
          addToTimeline={addToTimeline}
        />
      ) : null,
    [
      singleQueryDetails?.action_id,
      singleQueryDetails?.expiration,
      singleQueryDetails?.agents,
      serializedFormData.ecs_mapping,
      addToTimeline,
    ]
  );

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.agentSelection) {
        updateFieldValues({
          agentSelection: defaultValue.agentSelection,
        });
      }

      if (defaultValue?.packId && canRunPacks) {
        setQueryType('pack');

        if (!isPackDataFetched) return;
        const selectedPackOption = find(packsData?.data, ['id', defaultValue.packId]);
        if (selectedPackOption) {
          updateFieldValues({
            packId: [defaultValue.packId],
          });
        }

        return;
      }

      if (defaultValue?.query && canRunSingleQuery) {
        updateFieldValues({
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

        return;
      }

      if (canRunSingleQuery) {
        return setQueryType('query');
      }

      if (canRunPacks) {
        return setQueryType('pack');
      }
    }
  }, [
    canRunPacks,
    canRunSingleQuery,
    defaultValue,
    isPackDataFetched,
    packsData?.data,
    updateFieldValues,
  ]);

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

  useEffect(() => cleanupLiveQuery(), [queryType, packId, cleanupLiveQuery]);

  return (
    <>
      <Form form={form}>
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
          {!hideAgentsField ? (
            <EuiFlexItem>
              <UseField path="agentSelection" component={AgentsTableField} />
            </EuiFlexItem>
          ) : (
            <UseField path="agentSelection" component={GhostFormField} />
          )}
          {queryType === 'pack' ? (
            <>
              <EuiFlexItem>
                <UseField
                  path="packId"
                  component={PacksComboBoxField}
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  euiFieldProps={{ packsData: packsData?.data }}
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
      </Form>
      {showSavedQueryFlyout ? (
        <SavedQueryFlyout
          isExternal={!!addToTimeline}
          onClose={handleCloseSaveQueryFlyout}
          defaultValue={flyoutFormDefaultValue}
        />
      ) : null}
    </>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);
