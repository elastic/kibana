/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';

import uuid from 'uuid';
import { useForm as useHookForm } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import { get, isEmpty, map } from 'lodash';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { QueryPackSelectable } from '../../live_queries/form/QueryPackSelectable';
import type { EcsMappingFormField } from '../../packs/queries/ecs_mapping_editor_field';
import { defaultEcsFormData } from '../../packs/queries/ecs_mapping_editor_field';
import { convertECSMappingToFormValue } from '../../../common/schemas/common/utils';
import { ECSMappingEditorField } from '../../packs/queries/lazy_ecs_mapping_editor_field';
import { UseField, useFormContext } from '../../shared_imports';
import type { ArrayItem } from '../../shared_imports';
import { useKibana } from '../../common/lib/kibana';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { LiveQueryQueryField } from '../../live_queries/form/live_query_query_field';
import { queryClient } from '../../query_client';
import { StyledEuiAccordion } from '../../components/accordion';
import { PackFieldWrapper } from './pack_field_wrapper';

const GhostFormField = () => <></>;

interface IProps {
  item: ArrayItem;
  onSubmit: () => void;
}

interface OsqueryResponseActionsParamsFormFields {
  savedQueryId: string | null;
  id: string;
  ecs_mapping: EcsMappingFormField[];
  query: string;
  packId?: string[];
}

export const OsqueryResponseActionParamsForm: React.FunctionComponent<IProps> = React.memo(
  ({ item }) => {
    const uniqueId = useMemo(() => uuid.v4(), []);
    const hooksForm = useHookForm<OsqueryResponseActionsParamsFormFields>({
      defaultValues: {
        ecs_mapping: [defaultEcsFormData],
        id: uniqueId,
      },
      mode: 'onChange',
    });
    const { watch, setValue, register, clearErrors } = hooksForm;
    const context = useFormContext();
    const data = context.getFormData();
    const { params: defaultParams } = get(data, item.path);

    const watchedValues = watch();
    useEffect(() => {
      register('savedQueryId');
      register('id');
    }, [register]);

    const permissions = useKibana().services.application.capabilities.osquery;
    const [advancedContentState, setAdvancedContentState] = useState<
      EuiAccordionProps['forceState']
    >(defaultParams?.ecs_mapping?.length ? 'open' : 'closed');
    const handleToggle = useCallback((isOpen) => {
      const newState = isOpen ? 'open' : 'closed';
      setAdvancedContentState(newState);
    }, []);
    const [queryType, setQueryType] = useState<string>(
      defaultParams?.packId?.length ? 'pack' : 'query'
    );

    const isSavedQueryDisabled = useMemo(
      () => !permissions.runSavedQueries || !permissions.readSavedQueries,
      [permissions.readSavedQueries, permissions.runSavedQueries]
    );

    useEffectOnce(() => {
      if (defaultParams) {
        const { packId, ...restParams } = defaultParams;
        map(restParams, (value, key: keyof OsqueryResponseActionsParamsFormFields) => {
          if (!isEmpty(value)) {
            setValue(key, value);
          }
        });
        if (packId) {
          setValue('packId', [packId]);
        }
      }
    });

    const resetFormFields = useCallback(() => {
      setValue('packId', []);
      setValue('savedQueryId', '');
      setValue('query', '');
      setValue('ecs_mapping', [defaultEcsFormData]);
      clearErrors();
    }, [clearErrors, setValue]);

    useEffect(() => {
      if (queryType === 'query') {
        context.updateFieldValues({
          [item.path]: {
            actionTypeId: '.osquery',
            params: {
              id: watchedValues.id,
              savedQueryId: watchedValues.savedQueryId,
              query: watchedValues.query,
              ecs_mapping: watchedValues.ecs_mapping,
              packId: '',
            },
          },
        });
      } else {
        context.updateFieldValues({
          [item.path]: {
            actionTypeId: '.osquery',
            params: {
              id: watchedValues.id,
              packId: watchedValues?.packId?.length ? watchedValues?.packId[0] : undefined,
              savedQueryId: '',
              query: '',
              ecs_mapping: '',
            },
          },
        });
      }
    }, [context, item.path, queryType, watchedValues]);

    const handleSavedQueryChange = useCallback(
      (savedQuery) => {
        if (savedQuery) {
          setValue('savedQueryId', savedQuery.savedQueryId);
          setValue('query', savedQuery.query);
          setValue(
            'ecs_mapping',
            !isEmpty(savedQuery.ecs_mapping)
              ? convertECSMappingToFormValue(savedQuery.ecs_mapping)
              : [defaultEcsFormData]
          );
        } else {
          setValue('savedQueryId', null);
        }
      },
      [setValue]
    );

    return (
      <FormProvider {...hooksForm}>
        <QueryClientProvider client={queryClient}>
          <QueryPackSelectable
            queryType={queryType}
            setQueryType={setQueryType}
            // TODO check permissions
            canRunPacks={true}
            canRunSingleQuery={true}
            resetFormFields={resetFormFields}
          />
          {queryType === 'query' && (
            <>
              {!isSavedQueryDisabled && (
                <>
                  <SavedQueriesDropdown
                    disabled={isSavedQueryDisabled}
                    onChange={handleSavedQueryChange}
                  />
                </>
              )}
              <LiveQueryQueryField queryType={'query'} />
              <EuiSpacer size="m" />
              <StyledEuiAccordion
                id="advanced"
                forceState={advancedContentState}
                onToggle={handleToggle}
                buttonContent="Advanced"
              >
                <EuiSpacer size="xs" />
                <ECSMappingEditorField />
              </StyledEuiAccordion>
            </>
          )}

          {queryType === 'pack' && <PackFieldWrapper />}
        </QueryClientProvider>
        <UseField
          path={`${item.path}.params.query`}
          component={GhostFormField}
          readDefaultValueOnForm={!item.isNew}
        />
        <UseField
          path={`${item.path}.params.savedQueryId`}
          component={GhostFormField}
          readDefaultValueOnForm={!item.isNew}
        />
        <UseField
          path={`${item.path}.params.id`}
          component={GhostFormField}
          readDefaultValueOnForm={!item.isNew}
        />
        <UseField
          path={`${item.path}.params.ecs_mapping`}
          component={GhostFormField}
          readDefaultValueOnForm={!item.isNew}
        />
        <UseField
          path={`${item.path}.params.packId`}
          component={GhostFormField}
          readDefaultValueOnForm={!item.isNew}
        />
      </FormProvider>
    );
  }
);

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryResponseActionParamsForm as default };
