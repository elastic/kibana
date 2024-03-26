/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexName } from '@elastic/elasticsearch/lib/api/types';
import { useController } from 'react-hook-form';
import { ChatFormFields } from '../types';

export const useSourceIndicesField = () => {
  const {
    field: { value: selectedIndices, onChange },
  } = useController({ name: ChatFormFields.indices, defaultValue: [] });
  const addIndex = (newIndex: IndexName) => {
    onChange([...selectedIndices, newIndex]);
  };
  const removeIndex = (index: IndexName) => {
    onChange(selectedIndices.filter((indexName: string) => indexName !== index));
  };

  return {
    selectedIndices,
    addIndex,
    removeIndex,
  };
};
