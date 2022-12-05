/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useFilters } from './hooks/use_filters';
import type { FilterItemObj } from './types';

type FilterProps = FilterItemObj;

export const FilterItem = (props: FilterProps) => {
  const { addControl } = useFilters();

  useEffect(() => {
    addControl({ ...props });
  }, [props, addControl]);

  return null;
};
