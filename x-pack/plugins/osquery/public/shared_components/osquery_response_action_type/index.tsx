/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import uuid from 'uuid';
import { useForm as useHookForm } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import { get, isEmpty } from 'lodash';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { LiveQuery } from '../../live_queries';
import type { EcsMappingFormField } from '../../packs/queries/ecs_mapping_editor_field';
import { defaultEcsFormData } from '../../packs/queries/ecs_mapping_editor_field';
import { convertECSMappingToObject } from '../../../common/schemas/common/utils';
import { UseField, useFormContext } from '../../shared_imports';
import type { ArrayItem } from '../../shared_imports';
import { queryClient } from '../../query_client';

const GhostFormField = () => <></>;

interface IProps {
  item: ArrayItem;
  onSubmit: () => void;
}

interface OsqueryResponseActionsParamsFormFields {
  savedQueryId: string | undefined;
  id: string;
  ecs_mapping: EcsMappingFormField[];
  query: string;
  packId?: string;
}

export const OsqueryResponseActionParamsForm: React.FunctionComponent<IProps> = React.memo(
  ({ item }) => {
    const uniqueId = useMemo(() => uuid.v4(), []);
    const hooksForm = useHookForm<OsqueryResponseActionsParamsFormFields>({
      defaultValues: {
        ecs_mapping: [defaultEcsFormData],
        id: uniqueId,
      },
    });
    const { watch, setValue, register } = hooksForm;

    const watchedValues = watch();
    useEffect(() => {
      register('savedQueryId');
      register('id');
    }, [register]);

    const context = useFormContext();

    const data = context.getFormData();
    const { params: defaultParams } = get(data, item.path);

    useEffectOnce(() => {
      if (defaultParams) {
        setValue('savedQueryId', defaultParams.savedQueryId);
        setValue('query', defaultParams.query);
        setValue('id', defaultParams.id);
        setValue('packId', defaultParams.packId);
        if (!isEmpty(defaultParams.ecs_mapping)) {
          setValue('ecs_mapping', defaultParams.ecs_mapping);
        }
      }
    });

    useEffect(() => {
      context.updateFieldValues({
        [item.path]: { actionTypeId: '.osquery', params: watchedValues },
      });
    }, [context, item.path, watchedValues]);

    return (
      <FormProvider {...hooksForm}>
        <QueryClientProvider client={queryClient}>
          <LiveQuery
            enabled={true}
            query={watchedValues.query}
            ecs_mapping={convertECSMappingToObject(watchedValues.ecs_mapping)}
            savedQueryId={watchedValues.savedQueryId}
            hideAgentsField={true}
            hideSubmitButton={true}
          />
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
        </QueryClientProvider>
      </FormProvider>
    );
  }
);

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryResponseActionParamsForm as default };
