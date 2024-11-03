/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form/dist/types';
import { useUsageTracker } from './use_usage_tracker';
import { ChatForm, ChatFormFields } from '../types';
import { useIndicesFields } from './use_indices_fields';
import {
  createQuery,
  getDefaultQueryFields,
  getDefaultSourceFields,
  IndexFields,
} from '../utils/create_query';
import { AnalyticsEvents } from '../analytics/constants';

const mergeDefaultAndCurrentValues = (
  defaultFields: IndexFields,
  currentFields: IndexFields
): IndexFields =>
  Object.keys(defaultFields).reduce<IndexFields>((result, key) => {
    result[key] = currentFields?.[key] ?? defaultFields[key];

    return result;
  }, {});

export const useLoadFieldsByIndices = ({
  watch,
  setValue,
  getValues,
}: Pick<UseFormReturn<ChatForm>, 'watch' | 'getValues' | 'setValue'>) => {
  const usageTracker = useUsageTracker();
  const selectedIndices = watch(ChatFormFields.indices);
  const { fields } = useIndicesFields(selectedIndices);

  useEffect(() => {
    const [queryFields, sourceFields] = getValues([
      ChatFormFields.queryFields,
      ChatFormFields.sourceFields,
    ]);
    const defaultFields = getDefaultQueryFields(fields);
    const defaultSourceFields = getDefaultSourceFields(fields);
    const mergedQueryFields = mergeDefaultAndCurrentValues(defaultFields, queryFields);
    const mergedSourceFields = mergeDefaultAndCurrentValues(defaultSourceFields, sourceFields);

    setValue(
      ChatFormFields.elasticsearchQuery,
      createQuery(mergedQueryFields, mergedSourceFields, fields)
    );
    setValue(ChatFormFields.queryFields, mergedQueryFields);
    setValue(ChatFormFields.sourceFields, mergedSourceFields);

    usageTracker?.count(AnalyticsEvents.sourceFieldsLoaded, Object.values(fields)?.flat()?.length);
  }, [fields, getValues, setValue, usageTracker]);
};
