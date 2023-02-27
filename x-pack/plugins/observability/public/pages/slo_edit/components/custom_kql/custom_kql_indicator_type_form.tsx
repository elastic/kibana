/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import { CreateSLOInput } from '@kbn/slo-schema';

import { IndexSelection } from './index_selection';
import { QueryBuilder } from './query_builder';

export function CustomKqlIndicatorTypeForm() {
  const { control, watch } = useFormContext<CreateSLOInput>();
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <IndexSelection control={control} />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
          control={control}
          dataTestSubj="customKqlIndicatorFormQueryFilterInput"
          indexPatternString={watch('indicator.params.index')}
          label={i18n.translate('xpack.observability.slos.sloEdit.sliType.customKql.queryFilter', {
            defaultMessage: 'Query filter',
          })}
          name="indicator.params.filter"
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.sliType.customKql.customFilter',
            {
              defaultMessage: 'Custom filter to apply on the index',
            }
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
          control={control}
          dataTestSubj="customKqlIndicatorFormGoodQueryInput"
          indexPatternString={watch('indicator.params.index')}
          label={i18n.translate('xpack.observability.slos.sloEdit.sliType.customKql.goodQuery', {
            defaultMessage: 'Good query',
          })}
          name="indicator.params.good"
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.sliType.customKql.goodQueryPlaceholder',
            {
              defaultMessage: 'Define the good events',
            }
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
          control={control}
          dataTestSubj="customKqlIndicatorFormTotalQueryInput"
          indexPatternString={watch('indicator.params.index')}
          label={i18n.translate('xpack.observability.slos.sloEdit.sliType.customKql.totalQuery', {
            defaultMessage: 'Total query',
          })}
          name="indicator.params.total"
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.sliType.customKql.totalQueryPlaceholder',
            {
              defaultMessage: 'Define the total events',
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
