/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import type { EuiAccordionProps } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';

import uuid from 'uuid';
import { useForm as useHookForm, FormProvider } from 'react-hook-form';
import { get, isEmpty, map } from 'lodash';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import type { ResponseActionValidatorRef } from '@kbn/security-solution-plugin/public/detections/components/response_actions/response_actions_form';
import { QueryPackSelectable } from '../../live_queries/form/QueryPackSelectable';
import type { EcsMappingFormField } from '../../packs/queries/ecs_mapping_editor_field';
import { defaultEcsFormData } from '../../packs/queries/ecs_mapping_editor_field';
import { convertECSMappingToFormValue } from '../../../common/schemas/common/utils';
import { ECSMappingEditorField } from '../../packs/queries/lazy_ecs_mapping_editor_field';
import { useFormContext } from '../../shared_imports';
import type { ArrayItem } from '../../shared_imports';
import { useKibana } from '../../common/lib/kibana';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { LiveQueryQueryField } from '../../live_queries/form/live_query_query_field';
import { StyledEuiAccordion } from '../../components/accordion';
import { PackFieldWrapper } from './pack_field_wrapper';
import { usePack } from '../../packs/use_pack';

interface OsqueryResponseActionsParamsFormProps {
  item: ArrayItem;
  ref: React.RefObject<ResponseActionValidatorRef>;
}
interface ResponseActionValidatorRef {
  validation?: (
    actions: unknown
  ) => Promise<{ [key: number]: { errors: Record<string, unknown> } }>;
  actions?: unknown;
}

interface OsqueryResponseActionsParamsFormFields {
  savedQueryId: string | null;
  id: string;
  ecs_mapping: EcsMappingFormField[];
  query: string;
  packId?: string[];
}

const OsqueryResponseActionParamsFormComponent: React.FunctionComponent<OsqueryResponseActionsParamsFormProps> =
  forwardRef(({ item }, ref) => {
    const uniqueId = useMemo(() => uuid.v4(), []);
    const hooksForm = useHookForm<OsqueryResponseActionsParamsFormFields>({
      defaultValues: {
        ecs_mapping: [defaultEcsFormData],
        id: uniqueId,
      },
    });
    const { watch, setValue, register, clearErrors, formState, handleSubmit } = hooksForm;
    const { errors, isValid } = formState;
    const context = useFormContext();
    const data = context.getFormData();
    const { params: defaultParams } = get(data, item.path);

    const watchedValues = watch();
    const { data: packData } = usePack({
      packId: watchedValues?.packId?.[0],
      skip: !watchedValues?.packId?.[0],
    });
    const [queryType, setQueryType] = useState<string>(
      !isEmpty(defaultParams?.queries) ? 'pack' : 'query'
    );
    const onSubmit = useCallback(async () => null, []);

    useEffect(() => {
      // @ts-expect-error update types
      if (ref && ref.current) {
        // @ts-expect-error update types
        ref.current.validation = async (actions: Record<number, { isValid: boolean }>) => {
          await handleSubmit(onSubmit)();

          return {
            ...actions,
            [item.id]: {
              errors,
            },
          };
        };
      }
    }, [errors, handleSubmit, isValid, item.id, onSubmit, ref, watchedValues]);

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

    const isSavedQueryDisabled = useMemo(
      () => !permissions.runSavedQueries || !permissions.readSavedQueries,
      [permissions.readSavedQueries, permissions.runSavedQueries]
    );

    useEffect(() => {
      if (queryType === 'pack' && packData) {
        context.updateFieldValues({
          [item.path]: {
            actionTypeId: '.osquery',
            params: {
              id: watchedValues.id,
              packId: watchedValues?.packId?.length ? watchedValues?.packId[0] : undefined,
              queries: packData?.queries,
            },
          },
        });
      } else {
        context.updateFieldValues({
          [item.path]: {
            actionTypeId: '.osquery',
            params: {
              id: watchedValues.id,
              savedQueryId: watchedValues.savedQueryId,
              query: watchedValues.query,
              ecs_mapping: watchedValues.ecs_mapping,
            },
          },
        });
      }
    }, [context, item.path, packData, queryType, watchedValues]);

    useEffectOnce(() => {
      if (defaultParams && defaultParams.id) {
        const { packId, ...restParams } = defaultParams;
        map(restParams, (value, key: keyof OsqueryResponseActionsParamsFormFields) => {
          if (!isEmpty(value)) {
            setValue(key, value);
          }
        });
        if (!isEmpty(packId)) {
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

    return (
      <>
        <FormProvider {...hooksForm}>
          <QueryPackSelectable
            queryType={queryType}
            setQueryType={setQueryType}
            canRunPacks={canRunPacks}
            canRunSingleQuery={canRunSingleQuery}
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
        </FormProvider>
      </>
    );
  });

const OsqueryResponseActionParamsForm = React.memo(OsqueryResponseActionParamsFormComponent);

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryResponseActionParamsForm as default };
