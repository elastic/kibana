/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import { CreateSLOInput } from '@kbn/slo-schema';

import { IndexSelection } from './index_selection';
import { QueryBuilder } from '../common/query_builder';

export function CustomKqlIndicatorTypeForm() {
  const { control, watch } = useFormContext<CreateSLOInput>();
  const [isAdditionalSettingsOpen, setAdditionalSettingsOpen] = useState<boolean>(false);

  const handleAdditionalSettingsClick = () => {
    setAdditionalSettingsOpen(!isAdditionalSettingsOpen);
  };

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
          label={i18n.translate('xpack.observability.slo.sloEdit.sliType.customKql.queryFilter', {
            defaultMessage: 'Query filter',
          })}
          name="indicator.params.filter"
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.sliType.customKql.customFilter',
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
          label={i18n.translate('xpack.observability.slo.sloEdit.sliType.customKql.goodQuery', {
            defaultMessage: 'Good query',
          })}
          name="indicator.params.good"
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.sliType.customKql.goodQueryPlaceholder',
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
          label={i18n.translate('xpack.observability.slo.sloEdit.sliType.customKql.totalQuery', {
            defaultMessage: 'Total query',
          })}
          name="indicator.params.total"
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.sliType.customKql.totalQueryPlaceholder',
            {
              defaultMessage: 'Define the total events',
            }
          )}
        />
      </EuiFlexItem>

      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <EuiLink
            data-test-subj="customKqlIndicatorFormAdditionalSettingsToggle"
            onClick={handleAdditionalSettingsClick}
          >
            <EuiIcon type={isAdditionalSettingsOpen ? 'arrowDown' : 'arrowRight'} />{' '}
            {i18n.translate('xpack.observability.slo.sloEdit.sliType.additionalSettings.label', {
              defaultMessage: 'Additional settings',
            })}
          </EuiLink>
        </EuiFlexItem>

        {isAdditionalSettingsOpen && (
          <EuiFlexItem>
            <EuiFormLabel>
              {i18n.translate(
                'xpack.observability.slo.sloEdit.additionalSettings.timestampField.label',
                { defaultMessage: 'Timestamp field' }
              )}
            </EuiFormLabel>

            <Controller
              name="indicator.params.timestampField"
              shouldUnregister
              control={control}
              render={({ field: { ref, ...field } }) => (
                <EuiFieldText
                  {...field}
                  disabled={!watch('indicator.params.index')}
                  data-test-subj="sloFormAdditionalSettingsTimestampField"
                  placeholder={i18n.translate(
                    'xpack.observability.slo.sloEdit.additionalSettings.timestampField.placeholder',
                    { defaultMessage: 'Timestamp field used in the index, default to @timestamp' }
                  )}
                />
              )}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
