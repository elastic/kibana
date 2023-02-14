/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Control, UseFormWatch } from 'react-hook-form';
import type { CreateSLOInput } from '@kbn/slo-schema';

import { IndexSelection } from './custom_kql/index_selection';
import { QueryBuilder } from './custom_kql/query_builder';

export interface Props {
  control: Control<CreateSLOInput>;
  watch: UseFormWatch<CreateSLOInput>;
}

export function SloEditFormDefinitionCustomKql({ control, watch }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <IndexSelection control={control} />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
          control={control}
          dataTestSubj="sloFormCustomKqlFilterQueryInput"
          indexPatternString={watch('indicator.params.index')}
          label={i18n.translate(
            'xpack.observability.slos.sloEdit.sloDefinition.customKql.queryFilter',
            {
              defaultMessage: 'Query filter',
            }
          )}
          name="indicator.params.filter"
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.sloDefinition.customKql.customFilter',
            {
              defaultMessage: 'Custom filter to apply on the index',
            }
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
          control={control}
          dataTestSubj="sloFormCustomKqlGoodQueryInput"
          indexPatternString={watch('indicator.params.index')}
          label={i18n.translate(
            'xpack.observability.slos.sloEdit.sloDefinition.customKql.goodQuery',
            {
              defaultMessage: 'Good query',
            }
          )}
          name="indicator.params.good"
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.sloDefinition.customKql.goodQueryPlaceholder',
            {
              defaultMessage: 'Define the good events',
            }
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
          control={control}
          dataTestSubj="sloFormCustomKqlTotalQueryInput"
          indexPatternString={watch('indicator.params.index')}
          label={i18n.translate(
            'xpack.observability.slos.sloEdit.sloDefinition.customKql.totalQuery',
            {
              defaultMessage: 'Total query',
            }
          )}
          name="indicator.params.total"
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.sloDefinition.customKql.totalQueryPlaceholder',
            {
              defaultMessage: 'Define the total events',
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
