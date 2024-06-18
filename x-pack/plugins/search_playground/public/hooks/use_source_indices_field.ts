/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useController, useFormContext } from 'react-hook-form';
import { IndexName } from '@elastic/elasticsearch/lib/api/types';
import { useEffect, useState } from 'react';
import { useKibana } from './use_kibana';
import { APIRoutes, IndicesQuerySourceFields } from '../types';
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
  const { services } = useKibana();
  const [loading, setLoading] = useState<boolean>(false);
  const [noFieldsIndicesWarning, setNoFieldsIndicesWarning] = useState<string | null>(null);
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
    field: { onChange: onSourceFieldsChange },
  } = useController({
    name: ChatFormFields.sourceFields,
  });

  const { data: fields } = useQuery({
    enabled: selectedIndices.length > 0,
    queryKey: ['fields', selectedIndices.toString()],
    queryFn: async () => {
      const response = await services.http.post<IndicesQuerySourceFields>(
        APIRoutes.POST_QUERY_SOURCE_FIELDS,
        {
          body: JSON.stringify({ indices: selectedIndices }),
        }
      );
      return response;
    },
  });

  useEffect(() => {
    if (fields) {
      resetField(ChatFormFields.queryFields);

      const defaultFields = getDefaultQueryFields(fields);
      const defaultSourceFields = getDefaultSourceFields(fields);

      const indicesWithNoSourceFields = getIndicesWithNoSourceFields(defaultSourceFields);

      if (indicesWithNoSourceFields) {
        setNoFieldsIndicesWarning(indicesWithNoSourceFields);
      } else {
        setNoFieldsIndicesWarning(null);
      }

      onElasticsearchQueryChange(createQuery(defaultFields, defaultSourceFields, fields));
      onSourceFieldsChange(defaultSourceFields);
      usageTracker?.count(
        AnalyticsEvents.sourceFieldsLoaded,
        Object.values(fields)?.flat()?.length
      );
    } else {
      setNoFieldsIndicesWarning(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

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

  return {
    indices: selectedIndices,
    fields,
    loading,
    addIndex,
    removeIndex,
    noFieldsIndicesWarning,
  };
};
