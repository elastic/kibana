/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiIconTip } from '@elastic/eui';
import React from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { useFormContext } from 'react-hook-form';
import { OptionalText } from './optional_text';
import { useFetchGroupByCardinality } from '../../../../hooks/use_fetch_group_by_cardinality';
import { CreateSLOForm } from '../../types';
import { IndexFieldSelector } from './index_field_selector';
import { getGroupKeysProse } from '../../../../utils/slo/groupings';

export function GroupByField({ dataView, isLoading }: { dataView?: DataView; isLoading: boolean }) {
  const { watch } = useFormContext<CreateSLOForm>();

  const groupByFields =
    dataView?.fields?.filter((field) => field.aggregatable && field.type !== 'date') ?? [];
  const index = watch('indicator.params.index');
  const timestampField = watch('indicator.params.timestampField');
  const groupByField = watch('groupBy');

  const { isLoading: isGroupByCardinalityLoading, data: groupByCardinality } =
    useFetchGroupByCardinality(index, timestampField, groupByField);
  const groupBy = [groupByField].flat().filter((value) => !!value);
  const hasGroupBy = !groupBy.includes(ALL_VALUE) && groupBy.length;

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
      {!isGroupByCardinalityLoading && !!groupByCardinality && hasGroupBy && (
        <EuiCallOut
          size="s"
          iconType={groupByCardinality.isHighCardinality ? 'warning' : ''}
          color={groupByCardinality.isHighCardinality ? 'warning' : 'primary'}
          title={i18n.translate('xpack.slo.sloEdit.groupBy.cardinalityInfo', {
            defaultMessage:
              'Selected group by field {groupBy} will generate at least {card} SLO instances based on the last 24h sample data.',
            values: {
              card: groupByCardinality.cardinality,
              groupBy: getGroupKeysProse(groupByField),
            },
          })}
        />
      )}
    </>
  );
}
