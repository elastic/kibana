/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useController, useFormContext } from 'react-hook-form';
import { IndexName } from '@elastic/elasticsearch/lib/api/types';
import { useEffect, useState } from 'react';
import { useIndicesFields } from './use_indices_fields';
import { ChatForm, ChatFormFields } from '../types';
import {
  createQuery,
  getDefaultQueryFields,
  getDefaultSourceFields,
  IndexFields,
} from '../utils/create_query';
import { useUsageTracker } from './use_usage_tracker';
import { AnalyticsEvents } from '../analytics/constants';

export const getIndicesWithNoSourceFields = (
  defaultSourceFields: IndexFields
): string | undefined => {
  const indices: string[] = [];
  Object.keys(defaultSourceFields).forEach((index: string) => {
    if (defaultSourceFields[index].length === 0) {
      indices.push(index);
    }
  });

  return indices.length === 0 ? undefined : indices.join();
};

export const useSourceIndicesFields = () => {
  const usageTracker = useUsageTracker();
  const [loading, setLoading] = useState<boolean>(false);
  const { resetField } = useFormContext<ChatForm>();

  const {
    field: { value: selectedIndices, onChange: onIndicesChange },
  } = useController({
    name: ChatFormFields.indices,
  });

  const {
    field: { onChange: onElasticsearchQueryChange },
  } = useController({
    name: ChatFormFields.elasticsearchQuery,
    defaultValue: {},
  });

  const {
    field: { onChange: onQueryFieldsOnChange },
  } = useController<ChatForm, ChatFormFields.queryFields>({
    name: ChatFormFields.queryFields,
  });

  const {
    field: { onChange: onSourceFieldsChange, value: sourceFields },
  } = useController({
    name: ChatFormFields.sourceFields,
  });
  const { fields, isLoading: isFieldsLoading } = useIndicesFields(selectedIndices);

  useEffect(() => {
    if (fields && !isFieldsLoading) {
      resetField(ChatFormFields.queryFields);

      const defaultFields = getDefaultQueryFields(fields);
      const defaultSourceFields = getDefaultSourceFields(fields);

      onElasticsearchQueryChange(createQuery(defaultFields, fields));
      onQueryFieldsOnChange(defaultFields);

      const mergedSettledAndDefaultFields = Object.entries(defaultSourceFields).reduce(
        (result, [index, defaultSourceField]) => {
          return { ...result, [index]: sourceFields[index] || defaultSourceField };
        },
        {}
      );

      onSourceFieldsChange(mergedSettledAndDefaultFields);
      usageTracker?.count(
        AnalyticsEvents.sourceFieldsLoaded,
        Object.values(fields)?.flat()?.length
      );
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, isFieldsLoading]);

  const addIndex = (newIndex: IndexName) => {
    const newIndices = [...selectedIndices, newIndex];
    setLoading(true);
    onIndicesChange(newIndices);
    usageTracker?.count(AnalyticsEvents.sourceIndexUpdated, newIndices.length);
  };

  const removeIndex = (index: IndexName) => {
    const newIndices = selectedIndices.filter((indexName: string) => indexName !== index);
    setLoading(true);
    onIndicesChange(newIndices);
    usageTracker?.count(AnalyticsEvents.sourceIndexUpdated, newIndices.length);
  };

  const setIndices = (indices: IndexName[]) => {
    setLoading(true);
    onIndicesChange(indices);
    usageTracker?.count(AnalyticsEvents.sourceIndexUpdated, indices.length);
  };

  return {
    indices: selectedIndices,
    fields,
    loading,
    isFieldsLoading,
    addIndex,
    removeIndex,
    setIndices,
  };
};
