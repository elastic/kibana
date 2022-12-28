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

import { useFetchIndices } from '../../../hooks/use_fetch_indices';
import type { CreateSLOParamsForFE } from '../../../typings';

interface SloEditFormDefinitionCustomKqlProps {
  control: Control<CreateSLOParamsForFE>;
}

export function SloEditFormDefinitionCustomKql({ control }: SloEditFormDefinitionCustomKqlProps) {
  const { loading, indices = [] } = useFetchIndices();

  const indicesNames = indices.map(({ name }) => ({
    type: { iconType: '', color: '' },
    label: name,
    description: '',
  }));

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.sloDefinition.customKql.index', {
            defaultMessage: 'Index',
          })}
        </EuiFormLabel>

        <Controller
          name="indicator.params.index"
          shouldUnregister
          control={control}
          rules={{
            required: true,
            validate: (value) => Boolean(indices.find((index) => index.name === value)),
          }}
          render={({ field }) => (
            <EuiSuggest
              fullWidth
              isClearable
              aria-label="Indices"
              status={loading ? 'loading' : field.value ? 'unchanged' : 'unchanged'}
              onItemClick={({ label }) => {
                field.onChange(label);
              }}
              isInvalid={!Boolean(indicesNames.find((index) => index.label === field.value))}
              placeholder={i18n.translate(
                'xpack.observability.slos.sloEdit.sloDefinition.customKql.index',
                {
                  defaultMessage: 'Select an index',
                }
              )}
              suggestions={indicesNames}
              {...field}
            />
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.sloDefinition.customKql.queryFilter', {
            defaultMessage: 'Query filter',
          })}
        </EuiFormLabel>
        <Controller
          name="indicator.params.filter"
          shouldUnregister
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <EuiSuggest
              append={<EuiButtonEmpty>KQL</EuiButtonEmpty>}
              status="unchanged"
              aria-label="Filter"
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
          shouldUnregister
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <EuiSuggest
              append={<EuiButtonEmpty>KQL</EuiButtonEmpty>}
              status="unchanged"
              aria-label="Filter"
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
          shouldUnregister
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <EuiSuggest
              append={<EuiButtonEmpty>KQL</EuiButtonEmpty>}
              status="unchanged"
              aria-label="Filter"
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
