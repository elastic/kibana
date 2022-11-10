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
import { get, isEmpty, map, omit } from 'lodash';

import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { QueryPackSelectable } from '../../live_queries/form/query_pack_selectable';
import { useFormContext, useFormData } from '../../shared_imports';
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
  ecs_mapping: ECSMapping;
  query: string;
  packId?: string[];
  queries?: Array<{
    id: string;
    ecs_mapping: ECSMapping;
    query: string;
  }>;
}

const OsqueryResponseActionParamsFormComponent = forwardRef<
  ResponseActionValidatorRef,
  OsqueryResponseActionsParamsFormProps
>(({ item }, ref) => {
  const { updateFieldValues } = useFormContext();
  const [data] = useFormData({ watch: [item.path] });
  const { params: defaultParams } = get(data, item.path);
  const uniqueId = useMemo(() => uuid.v4(), []);
  const hooksForm = useHookForm<OsqueryResponseActionsParamsFormFields>({
    defaultValues: defaultParams
      ? {
          ...omit(defaultParams, ['ecsMapping', 'packId']),
          ecs_mapping: defaultParams.ecsMapping ?? {},
          packId: [defaultParams.packId] ?? [],
        }
      : {
          ecs_mapping: {},
          id: uniqueId,
        },
  });

  const { watch, register, formState, handleSubmit, reset } = hooksForm;
  const { errors, isValid } = formState;

  const watchedValues = watch();
  const { data: packData } = usePack({
    packId: watchedValues?.packId?.[0],
    skip: !watchedValues?.packId?.[0],
  });
  const [queryType, setQueryType] = useState<string>(
    !isEmpty(defaultParams?.queries) ? 'pack' : 'query'
  );
  const onSubmit = useCallback(
    async (formData) => {
      updateFieldValues({
        [item.path]:
          queryType === 'pack'
            ? {
                actionTypeId: OSQUERY_TYPE,
                params: {
                  id: formData.id,
                  packId: formData?.packId?.length ? formData?.packId[0] : undefined,
                  queries: packData
                    ? map(packData.queries, (query, queryId: string) => ({
                        ...query,
                        id: queryId,
                      }))
                    : formData.queries,
                },
              }
            : {
                actionTypeId: OSQUERY_TYPE,
                params: {
                  id: formData.id,
                  savedQueryId: formData.savedQueryId,
                  query: formData.query,
                  ecsMapping: formData.ecs_mapping,
                },
              },
      });
    },
    [updateFieldValues, item.path, packData, queryType]
  );

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

  useEffect(() => {
    const subscription = watch(() => handleSubmit(onSubmit)());

    return () => subscription.unsubscribe();
  }, [handleSubmit, onSubmit, watch]);

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
          resetFormFields={reset}
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
