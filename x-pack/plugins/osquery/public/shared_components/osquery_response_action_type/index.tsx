/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { EuiSpacer } from '@elastic/eui';

import uuid from 'uuid';
import { useForm as useHookForm, FormProvider } from 'react-hook-form';
import { get, isEmpty, map } from 'lodash';
import useEffectOnce from 'react-use/lib/useEffectOnce';

import {
  convertECSMappingToFormValue,
  convertECSMappingToObject,
} from '../../../common/schemas/common/utils';
import { QueryPackSelectable } from '../../live_queries/form/query_pack_selectable';
import type { EcsMappingFormField } from '../../packs/queries/ecs_mapping_editor_field';
import { defaultEcsFormData } from '../../packs/queries/ecs_mapping_editor_field';
import { useFormContext } from '../../shared_imports';
import type { ArrayItem } from '../../shared_imports';
import { useKibana } from '../../common/lib/kibana';
import { LiveQueryQueryField } from '../../live_queries/form/live_query_query_field';
import { PackFieldWrapper } from './pack_field_wrapper';
import { usePack } from '../../packs/use_pack';

const OSQUERY_TYPE = '.osquery';

interface OsqueryResponseActionsParamsFormProps {
  item: ArrayItem;
}

interface ResponseActionValidatorRef {
  validation: {
    [key: string]: () => Promise<boolean>;
  };
}

interface OsqueryResponseActionsParamsFormFields {
  savedQueryId: string | null;
  id: string;
  ecs_mapping: EcsMappingFormField[];
  query: string;
  packId?: string[];
  queries?: Array<{
    id: string;
    ecs_mapping: EcsMappingFormField[];
    query: string;
  }>;
}

const OsqueryResponseActionParamsFormComponent: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<OsqueryResponseActionsParamsFormProps> &
    React.RefAttributes<ResponseActionValidatorRef>
> = forwardRef(({ item }, ref) => {
  const uniqueId = useMemo(() => uuid.v4(), []);
  const hooksForm = useHookForm<OsqueryResponseActionsParamsFormFields>({
    defaultValues: {
      ecs_mapping: [defaultEcsFormData],
      id: uniqueId,
    },
  });
  //
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
  const onSubmit = useCallback(async () => {
    try {
      if (queryType === 'pack') {
        context.updateFieldValues({
          [item.path]: {
            actionTypeId: OSQUERY_TYPE,
            params: {
              id: watchedValues.id,
              packId: watchedValues?.packId?.length ? watchedValues?.packId[0] : undefined,
              queries: packData
                ? map(packData.queries, (query, queryId: string) => ({
                    ...query,
                    id: queryId,
                  }))
                : watchedValues.queries,
            },
          },
        });
      } else {
        context.updateFieldValues({
          [item.path]: {
            actionTypeId: OSQUERY_TYPE,
            params: {
              id: watchedValues.id,
              savedQueryId: watchedValues.savedQueryId,
              query: watchedValues.query,
              ecs_mapping: convertECSMappingToObject(watchedValues.ecs_mapping),
            },
          },
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }, [
    context,
    item.path,
    packData,
    queryType,
    watchedValues.ecs_mapping,
    watchedValues.id,
    watchedValues?.packId,
    watchedValues.queries,
    watchedValues.query,
    watchedValues.savedQueryId,
  ]);

  useEffect(() => {
    // @ts-expect-error update types
    if (ref && ref.current) {
      // @ts-expect-error update types
      ref.current.validation[item.id] = async () => {
        await handleSubmit(onSubmit)();

        return isEmpty(errors);
      };
    }
  }, [errors, handleSubmit, isValid, item.id, onSubmit, ref, watchedValues]);

  useEffect(() => {
    register('savedQueryId');
    register('id');
  }, [register]);

  const permissions = useKibana().services.application.capabilities.osquery;

  useEffectOnce(() => {
    if (defaultParams && defaultParams.id) {
      const { packId, ecs_mapping: ecsMapping, ...restParams } = defaultParams;
      map(restParams, (value, key: keyof OsqueryResponseActionsParamsFormFields) => {
        if (!isEmpty(value)) {
          setValue(key, value);
        }
      });
      if (ecsMapping) {
        const converted = convertECSMappingToFormValue(ecsMapping);
        setValue('ecs_mapping', converted);
      }

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

  const queryDetails = useMemo(
    () => ({
      queries: watchedValues.queries,
      action_id: watchedValues.id,
      agents: [],
    }),
    [watchedValues.id, watchedValues.queries]
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
        <EuiSpacer size="m" />
        {queryType === 'query' && <LiveQueryQueryField />}
        {queryType === 'pack' && (
          <PackFieldWrapper
            liveQueryDetails={watchedValues.queries && !packData ? queryDetails : undefined}
          />
        )}
      </FormProvider>
    </>
  );
});

const OsqueryResponseActionParamsForm = React.memo(OsqueryResponseActionParamsFormComponent);

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryResponseActionParamsForm as default };
