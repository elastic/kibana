/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';
import type { UseFormReturn } from 'react-hook-form';
import { useForm as useHookForm, FormProvider } from 'react-hook-form';
import { omit } from 'lodash';

import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { QueryPackSelectable } from '../../live_queries/form/query_pack_selectable';
import { useKibana } from '../../common/lib/kibana';
import { LiveQueryQueryField } from '../../live_queries/form/live_query_query_field';
import { PackFieldWrapper } from './pack_field_wrapper';
import { usePack } from '../../packs/use_pack';

const OSQUERY_TYPE = '.osquery';

// interface OsqueryResponseActionsParamsFormProps {}

export interface ResponseActionValidatorRef {
  validation: UseFormReturn<OsqueryResponseActionsParamsFormFields>['formState']['errors'];
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

const OsqueryResponseActionParamsFormComponent = ({ defaultParams, nextIndices }) => {
  const lastErrors = useRef(null);
  const uniqueId = useMemo(() => uuid.v4(), []);
  const hooksForm = useHookForm<OsqueryResponseActionsParamsFormFields>({
    defaultValues: defaultParams
      ? {
          ...omit(defaultParams, ['ecsMapping', 'packId']),
          ecs_mapping: defaultParams.ecsMapping,
          packId: defaultParams.packId ? [defaultParams.packId] : [],
        }
      : {
          ecs_mapping: {},
          id: uniqueId,
        },
  });

  const { watch, register, formState, handleSubmit, trigger, reset } = hooksForm;
  const { errors } = formState;

  const watchedValues = watch();
  const { data: packData } = usePack({
    packId: watchedValues?.packId?.[0],
    skip: !watchedValues?.packId?.[0],
  });
  const [queryType, setQueryType] = useState<string>(defaultParams?.packId ? 'pack' : 'query');

  // const onSubmit = useCallback(
  //   async (formData) => {
  //     updateFieldValues({
  //       [item.path]:
  //         queryType === 'pack'
  //           ? {
  //               actionTypeId: OSQUERY_TYPE,
  //               params: {
  //                 id: formData.id,
  //                 packId: formData?.packId?.length ? formData?.packId[0] : undefined,
  //                 queries: packData
  //                   ? map(packData.queries, (query, queryId: string) => ({
  //                       ...query,
  //                       id: queryId,
  //                     }))
  //                   : formData.queries,
  //               },
  //             }
  //           : {
  //               actionTypeId: OSQUERY_TYPE,
  //               params: {
  //                 id: formData.id,
  //                 savedQueryId: formData.savedQueryId,
  //                 query: formData.query,
  //                 ecsMapping: formData.ecs_mapping,
  //               },
  //             },
  //     });
  //   },
  //   [updateFieldValues, item.path, packData, queryType]
  // );

  useEffect(() => {
    lastErrors.current = formState.errors;
    nextIndices(formState.errors);
  }, [nextIndices, formState]);

  useEffect(() => {
    register('savedQueryId');
    register('id');
  }, [register]);

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
        {queryType === 'query' && <LiveQueryQueryField queryType={queryType} />}
        {queryType === 'pack' && (
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
