/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiFormLabel, EuiSuggest } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Control, Controller } from 'react-hook-form';
import type { CreateSLOInput } from '@kbn/slo-schema';

import { IndexSelection } from './custom_kql/index_selection';

export interface Props {
  control: Control<CreateSLOInput>;
}

export function SloEditFormDefinitionCustomKql({ control }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <IndexSelection control={control} />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.sloDefinition.customKql.queryFilter', {
            defaultMessage: 'Query filter',
          })}
        </EuiFormLabel>
        <Controller
          name="indicator.params.filter"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <EuiSuggest
              append={<EuiButtonEmpty>KQL</EuiButtonEmpty>}
              status="unchanged"
              aria-label="Filter query"
              data-test-subj="sloFormCustomKqlFilterQueryInput"
              placeholder={i18n.translate(
                'xpack.observability.slos.sloEdit.sloDefinition.customKql.customFilter',
                {
                  defaultMessage: 'Custom filter to apply on the index',
                }
              )}
              suggestions={[]}
              {...field}
            />
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.sloDefinition.customKql.goodQuery', {
            defaultMessage: 'Good query',
          })}
        </EuiFormLabel>
        <Controller
          name="indicator.params.good"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <EuiSuggest
              append={<EuiButtonEmpty>KQL</EuiButtonEmpty>}
              status="unchanged"
              aria-label="Good filter"
              data-test-subj="sloFormCustomKqlGoodQueryInput"
              placeholder={i18n.translate(
                'xpack.observability.slos.sloEdit.sloDefinition.customKql.goodQueryPlaceholder',
                {
                  defaultMessage: 'Define the good events',
                }
              )}
              suggestions={[]}
              {...field}
            />
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.sloDefinition.customKql.totalQuery', {
            defaultMessage: 'Total query',
          })}
        </EuiFormLabel>
        <Controller
          name="indicator.params.total"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <EuiSuggest
              append={<EuiButtonEmpty>KQL</EuiButtonEmpty>}
              status="unchanged"
              aria-label="Total filter"
              data-test-subj="sloFormCustomKqlTotalQueryInput"
              placeholder={i18n.translate(
                'xpack.observability.slos.sloEdit.sloDefinition.customKql.totalQueryPlaceholder',
                {
                  defaultMessage: 'Define the total events',
                }
              )}
              suggestions={[]}
              {...field}
            />
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
