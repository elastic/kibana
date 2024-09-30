/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import { useFormContext } from 'react-hook-form';
import { IndexSelection } from './index_selection';
import { IndexFieldSelector } from '../common/index_field_selector';
import { CreateSLOForm } from '../../types';

export function IndexAndTimestampField({
  dataView,
  isLoading,
}: {
  dataView?: DataView;
  isLoading: boolean;
}) {
  const { watch } = useFormContext<CreateSLOForm>();
  const index = watch('indicator.params.index');

  const timestampFields = dataView?.fields?.filter((field) => field.type === 'date') ?? [];

  return (
    <EuiFlexGroup gutterSize="m" css={{ paddingRight: 34 }}>
      <EuiFlexItem grow={5}>
        <IndexSelection selectedDataView={dataView} />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <IndexFieldSelector
          indexFields={timestampFields}
          name="indicator.params.timestampField"
          label={i18n.translate('xpack.slo.sloEdit.timestampField.label', {
            defaultMessage: 'Timestamp field',
          })}
          placeholder={i18n.translate('xpack.slo.sloEdit.timestampField.placeholder', {
            defaultMessage: 'Select a timestamp field',
          })}
          isLoading={!!index && isLoading}
          isDisabled={!index}
          isRequired
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
