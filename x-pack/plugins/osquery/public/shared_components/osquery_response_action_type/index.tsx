/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { FieldErrors } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { useForm as useHookForm, FormProvider } from 'react-hook-form';
import { map, omit } from 'lodash';

import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { usePack } from '../../packs/use_pack';
import { QueryPackSelectable } from '../../live_queries/form/query_pack_selectable';
import { useKibana } from '../../common/lib/kibana';
import { LiveQueryQueryField } from '../../live_queries/form/live_query_query_field';
import { PackFieldWrapper } from './pack_field_wrapper';

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
          queryType: 'query',
        },
  });

  const { watch, register, formState, control } = hooksForm;

  const [packId, queryType, queries] = watch(['packId', 'queryType', 'queries']);
  const { data: packData } = usePack({
    packId: packId?.[0],
    skip: !packId?.[0],
  });

  const { replace } = useFieldArray({
    name: 'queries',
    control,
  });

  useEffect(() => {
    if (packData?.queries) {
      const queriesArray = map(packData?.queries, (query, queryId: string) => ({
        ...query,
        id: queryId,
      }));

      replace(queriesArray);
    }
  }, [packData, replace]);

  useEffect(() => {
    onError(formState.errors);
  }, [onError, formState]);

  useEffect(() => {
    register('savedQueryId');
  }, [register]);

  useEffect(() => {
    const subscription = watch((formData) => {
      onChange(
        // @ts-expect-error update types
        formData.queryType === 'pack'
          ? {
              packId: formData?.packId?.length ? formData?.packId[0] : undefined,
              queries: formData.queries,
            }
          : {
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
      queries,
      agents: [],
    }),
    [queries]
  );

  return (
    <>
      <FormProvider {...hooksForm}>
        <QueryPackSelectable canRunPacks={canRunPacks} canRunSingleQuery={canRunSingleQuery} />
        <EuiSpacer size="m" />
        {queryType === 'query' && <LiveQueryQueryField />}
        {queryType === 'pack' && (
          <PackFieldWrapper liveQueryDetails={queries && !packData ? queryDetails : undefined} />
        )}
      </FormProvider>
    </>
  );
};

const OsqueryResponseActionParamsForm = React.memo(OsqueryResponseActionParamsFormComponent);

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryResponseActionParamsForm as default };
