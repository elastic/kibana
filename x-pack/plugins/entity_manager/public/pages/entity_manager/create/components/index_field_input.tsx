/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIndexFields } from '../../../../hooks/use_index_fields';

interface IndexFieldInputProps {
  fieldName: string;
  indexPatterns?: string[];
  label: string;
  defaultValue: string;
  asArray: boolean;
}

export function IndexFieldInput({ indexPatterns }: IndexFieldInputProps) {
  const { data: fields } = useIndexFields({ indexPatterns });
}
