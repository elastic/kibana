/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiAccordion,
  EuiAccordionProps,
  EuiCard,
  EuiSuperSelectOption,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { pickBy, isEmpty, map, find } from 'lodash';
import { convertECSMappingToObject } from '../../../common/schemas/common/utils';
import {
  UseField,
  Form,
  FormData,
  useForm,
  useFormData,
  SuperSelectField,
} from '../../shared_imports';
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
import { useLiveQueryAction } from '../use_create_live_query_action';

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
  const [advancedContentState, setAdvancedContentState] =
    useState<EuiAccordionProps['forceState']>('closed');
  const [showSavedQueryFlyout, setShowSavedQueryFlyout] = useState(false);
  const [queryType, setQueryType] = useState<string>(() =>
    defaultValue?.packId ? 'pack' : 'query'
  );

  const handleShowSaveQueryFlout = useCallback(() => setShowSavedQueryFlyout(true), []);
  const handleCloseSaveQueryFlout = useCallback(() => setShowSavedQueryFlyout(false), []);

  const { data, isLoading, mutateAsync, isError, isSuccess } = useLiveQueryAction({ onSuccess });

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
      packId,
      ...formData
    }) =>
      pickBy(
        {
          ...formData,
          pack_id: packId,
          saved_query_id: savedQueryId,
          ecs_mapping: convertECSMappingToObject(ecs_mapping),
        },
        (value) => !isEmpty(value)
      ),
  });

  const { updateFieldValues, setFieldValue, submit, isSubmitting } = form;

  const actionId = useMemo(() => data?.actions[0].action_id, [data?.actions]);
  const agentIds = useMemo(() => data?.actions[0].agents, [data?.actions]);
  const [
    { agentSelection, ecs_mapping: ecsMapping, query, savedQueryId, packId },
    formDataSerializer,
  ] = useFormData({
    form,
  });
  console.error('agentIds', agentIds);

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

  const submitButtonContent = useMemo(
    () => (
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
            disabled={
              !enabled ||
              !agentSelected ||
              (queryType === 'query' && !queryValueProvided) ||
              (queryType === 'pack' && !packId) ||
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
    ),
    [
      agentSelected,
      enabled,
      formType,
      handleShowSaveQueryFlout,
      isSubmitting,
      packId,
      permissions.writeSavedQueries,
      queryType,
      queryValueProvided,
      resultsStatus,
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

  const card1Clicked = () => {
    setQueryType('query');
  };

  const card2Clicked = () => {
    setQueryType('pack');
  };

  const { data: packsData } = usePacks({});

  const packOptions = useMemo<Array<EuiSuperSelectOption<string>>>(
    () =>
      packsData?.saved_objects?.map((packSO) => ({
        value: packSO.id,
        inputDisplay: <>{`${packSO.attributes.name} (${packSO.id})`}</>,
        dropdownDisplay: (
          <>
            <strong>{packSO.attributes.name}</strong>
            <EuiText size="s" color="subdued">
              <p>{packSO.attributes.description}</p>
            </EuiText>
          </>
        ),
      })) ?? [],
    [packsData]
  );

  const selectedPackData = useMemo(
    () => find(packsData?.saved_objects, { id: packId }),
    [packId, packsData]
  );

  useLayoutEffect(() => {
    if (defaultValue?.packId) {
      setQueryType('pack');
      const selectedPackOption = find(packOptions, ['value', defaultValue.packId]);
      if (selectedPackOption) {
        updateFieldValues({
          packId: defaultValue.packId,
        });
      }
    }
  }, [defaultValue, packOptions, updateFieldValues]);

  console.error('data', data);

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
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="l">
              <EuiFlexItem>
                <EuiCard
                  title="Single query"
                  description="Run a saved query or start from scratch."
                  selectable={{
                    onClick: card1Clicked,
                    isSelected: queryType === 'query',
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCard
                  title="Pack"
                  description="Run a set of queries in a pack."
                  selectable={{
                    onClick: card2Clicked,
                    isSelected: queryType === 'pack',
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {queryType === 'pack' ? (
            <>
              <EuiFlexItem>
                <UseField
                  path="packId"
                  component={SuperSelectField}
                  euiFieldProps={{
                    options: packOptions,
                    itemLayoutAlign: 'top',
                    hasDividers: true,
                  }}
                />
              </EuiFlexItem>
              <EuiSpacer />
              <EuiFlexItem>
                <PackQueriesStatusTable
                  agentIds={agentIds}
                  data={data?.actions[0].queries ?? selectedPackData?.attributes?.queries ?? []}
                />
              </EuiFlexItem>
              {submitButtonContent}
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
          onClose={handleCloseSaveQueryFlout}
          defaultValue={flyoutFormDefaultValue}
        />
      ) : null}
    </>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);
