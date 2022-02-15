/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { JobFieldType } from '../../../../../common/types';
import { FieldTypeIcon } from '../../../common/components/field_type_icon';
import { MultiSelectPicker, Option } from '../../../common/components/multi_select_picker';
import { jobTypeLabels } from '../../../common/util/field_types_utils';

export const DataVisualizerFieldTypeFilter: FC<{
  indexedFieldTypes: JobFieldType[];
  setVisibleFieldTypes(q: string[]): void;
  visibleFieldTypes: string[];
}> = ({ indexedFieldTypes, setVisibleFieldTypes, visibleFieldTypes }) => {
  const options: Option[] = useMemo(() => {
    return indexedFieldTypes.map((indexedFieldName) => {
      const label = jobTypeLabels[indexedFieldName] ?? '';

      return {
        value: indexedFieldName,
        name: (
          <EuiFlexGroup>
            <EuiFlexItem grow={true}> {label}</EuiFlexItem>
            {indexedFieldName && (
              <EuiFlexItem grow={false}>
                <FieldTypeIcon type={indexedFieldName} tooltipEnabled={false} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      };
    });
  }, [indexedFieldTypes]);
  const fieldTypeTitle = useMemo(
    () =>
      i18n.translate('xpack.dataVisualizer.index.fieldTypeSelect', {
        defaultMessage: 'Field type',
      }),
    []
  );
  return (
    <MultiSelectPicker
      title={fieldTypeTitle}
      options={options}
      onChange={setVisibleFieldTypes}
      checkedOptions={visibleFieldTypes}
      dataTestSubj={'dataVisualizerFieldTypeSelect'}
    />
  );
};
