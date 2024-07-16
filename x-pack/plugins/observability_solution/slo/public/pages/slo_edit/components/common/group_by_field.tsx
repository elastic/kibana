/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, QuerySchema } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import { EuiIconTip } from '@elastic/eui';
import React from 'react';
import { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import { useFormContext } from 'react-hook-form';
import { OptionalText } from './optional_text';
import { CreateSLOForm } from '../../types';
import { IndexFieldSelector } from './index_field_selector';
import { GroupByCardinality } from './group_by_cardinality';

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
      <IndexFieldSelector
        indexFields={groupByFields}
        name="groupBy"
        defaultValue={ALL_VALUE}
        label={
          <span>
            {i18n.translate('xpack.slo.sloEdit.groupBy.label', {
              defaultMessage: 'Group by',
            })}{' '}
            <EuiIconTip
              content={i18n.translate('xpack.slo.sloEdit.groupBy.tooltip', {
                defaultMessage: 'Create individual SLOs for each value of the selected field.',
              })}
              position="top"
            />
          </span>
        }
        labelAppend={<OptionalText />}
        placeholder={i18n.translate('xpack.slo.sloEdit.groupBy.placeholder', {
          defaultMessage: 'Select an optional field to group by',
        })}
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
