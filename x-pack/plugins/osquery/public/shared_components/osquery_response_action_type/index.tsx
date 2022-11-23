/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';
import type { FieldErrors } from 'react-hook-form';
import { useForm as useHookForm, FormProvider } from 'react-hook-form';
import { map, omit } from 'lodash';

import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { QueryPackSelectable } from '../../live_queries/form/query_pack_selectable';
import { useKibana } from '../../common/lib/kibana';
import { LiveQueryQueryField } from '../../live_queries/form/live_query_query_field';
import { PackFieldWrapper } from './pack_field_wrapper';
import { usePack } from '../../packs/use_pack';

interface OsqueryResponseActionsValues {
  savedQueryId?: string | null;
  id?: string;
  ecsMapping?: ECSMapping;
  query?: string;
  packId?: string;
  queries?: Array<{
    id: string;
    ecs_mapping: ECSMapping;
    query: string;
  }>;
}

interface OsqueryResponseActionsParamsFormFields {
  savedQueryId: string | null;
  id: string;
  ecs_mapping: ECSMapping;
  query: string;
  packId?: string[];
  queries: Array<{
    id: string;
    ecs_mapping: ECSMapping;
    query: string;
  }>;
  queryType: 'query' | 'pack';
}

export interface OsqueryResponseActionsParamsFormProps {
  defaultValues?: OsqueryResponseActionsValues;
  onChange: (data: OsqueryResponseActionsValues) => void;
  onError: (error: FieldErrors<OsqueryResponseActionsParamsFormFields>) => void;
}

const OsqueryResponseActionParamsFormComponent = ({
  defaultValues,
  onError,
  onChange,
}: OsqueryResponseActionsParamsFormProps) => {
  const lastErrors = useRef<FieldErrors<OsqueryResponseActionsParamsFormFields>>(null);
  const uniqueId = useMemo(() => uuid.v4(), []);
  const hooksForm = useHookForm<OsqueryResponseActionsParamsFormFields>({
    mode: 'all',
    defaultValues: defaultValues
      ? {
          ...omit(defaultValues, ['ecsMapping', 'packId']),
          ecs_mapping: defaultValues.ecsMapping,
          packId: defaultValues.packId ? [defaultValues.packId] : [],
          queryType: defaultValues.packId ? 'pack' : 'query',
        }
      : {
          ecs_mapping: {},
          id: uniqueId,
          queryType: 'query',
        },
  });

  const { watch, register, formState } = hooksForm;

  const watchedValues = watch();
  const { data: packData } = usePack({
    packId: watchedValues?.packId?.[0],
    skip: !watchedValues?.packId?.[0],
  });

  useEffect(() => {
    // @ts-expect-error update types
    lastErrors.current = formState.errors;
    onError(formState.errors);
  }, [onError, formState]);

  useEffect(() => {
    register('savedQueryId');
    register('id');
  }, [register]);

  useEffect(() => {
    const subscription = watch((formData) => {
      onChange(
        // @ts-expect-error update types
        formData.queryType === 'pack'
          ? {
              id: formData.id,
              packId: formData?.packId?.length ? formData?.packId[0] : undefined,
              queries: packData
                ? map(packData.queries, (query, queryId: string) => ({
                    ...query,
                    id: queryId,
                  }))
                : formData.queries,
            }
          : {
              id: formData.id,
              savedQueryId: formData.savedQueryId,
              query: formData.query,
              ecsMapping: formData.ecs_mapping,
            }
      );
    });

    return () => subscription.unsubscribe();
  }, [onChange, packData, watch]);

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
        <QueryPackSelectable canRunPacks={canRunPacks} canRunSingleQuery={canRunSingleQuery} />
        <EuiSpacer size="m" />
        {watchedValues.queryType === 'query' && <LiveQueryQueryField />}
        {watchedValues.queryType === 'pack' && (
          <PackFieldWrapper
            liveQueryDetails={watchedValues.queries && !packData ? queryDetails : undefined}
          />
        )}
      </FormProvider>
    </>
  );
};

const OsqueryResponseActionParamsForm = React.memo(OsqueryResponseActionParamsFormComponent);

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryResponseActionParamsForm as default };
