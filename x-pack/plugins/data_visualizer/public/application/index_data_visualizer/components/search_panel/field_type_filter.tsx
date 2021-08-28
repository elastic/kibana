/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { JOB_FIELD_TYPES_OPTIONS } from '../../../../../common/constants';
import type { JobFieldType } from '../../../../../common/types/job_field_type';
import { FieldTypeIcon } from '../../../common/components/field_type_icon/field_type_icon';
import type { Option } from '../../../common/components/multi_select_picker/multi_select_picker';
import { MultiSelectPicker } from '../../../common/components/multi_select_picker/multi_select_picker';

export const DatavisualizerFieldTypeFilter: FC<{
  indexedFieldTypes: JobFieldType[];
  setVisibleFieldTypes(q: string[]): void;
  visibleFieldTypes: string[];
}> = ({ indexedFieldTypes, setVisibleFieldTypes, visibleFieldTypes }) => {
  const options: Option[] = useMemo(() => {
    return indexedFieldTypes.map((indexedFieldName) => {
      const item = JOB_FIELD_TYPES_OPTIONS[indexedFieldName];

      return {
        value: indexedFieldName,
        name: (
          <EuiFlexGroup>
            <EuiFlexItem grow={true}> {item.name}</EuiFlexItem>
            {indexedFieldName && (
              <EuiFlexItem grow={false}>
                <FieldTypeIcon
                  type={indexedFieldName}
                  fieldName={item.name}
                  tooltipEnabled={false}
                  needsAria={true}
                />
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
