/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import { QuerySchema } from '@kbn/slo-schema';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { CreateSLOForm } from '../../types';
import { GroupByCardinality } from './group_by_cardinality';
import { GroupByFieldSelector } from './group_by_field_selector';

export function GroupByField({
  dataView,
  isLoading,
  filters,
}: {
  dataView?: DataView;
  isLoading: boolean;
  filters?: QuerySchema;
}) {
  const { watch } = useFormContext<CreateSLOForm>();

  const groupByFields = dataView?.fields?.filter((field) => canGroupBy(field)) ?? [];
  const index = watch('indicator.params.index');

  return (
    <>
      <GroupByFieldSelector
        indexFields={groupByFields}
        isLoading={!!index && isLoading}
        isDisabled={!index}
      />
      <GroupByCardinality customFilters={filters} />
    </>
  );
}

export const canGroupBy = (field: FieldSpec) => {
  const isAggregatable = field.aggregatable;
  const isNotDate = field.type !== 'date';
  // handles multi fields where there are multi es types, which could include 'text'
  // text fields break the transforms so we must ensure that the field is only a keyword
  const isOnlyKeyword = field.esTypes?.length === 1 && field.esTypes[0] === 'keyword';

  return isAggregatable && isNotDate && isOnlyKeyword;
};
