/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { MultiSelectPicker, Option } from '../../../../components/multi_select_picker';
import type {
  FileBasedFieldVisConfig,
  FileBasedUnknownFieldVisConfig,
} from '../../../stats_table/types/field_vis_config';
import { FieldTypeIcon } from '../../../../components/field_type_icon';
import { ML_JOB_FIELD_TYPES_OPTIONS } from '../../../index_based/components/search_panel/field_type_filter';

interface Props {
  fields: Array<FileBasedFieldVisConfig | FileBasedUnknownFieldVisConfig>;
  setVisibleFieldTypes(q: string[]): void;
  visibleFieldTypes: string[];
}

export const DataVisualizerFieldTypesFilter: FC<Props> = ({
  fields,
  setVisibleFieldTypes,
  visibleFieldTypes,
}) => {
  const fieldNameTitle = useMemo(
    () =>
      i18n.translate('xpack.ml.dataVisualizer.fileBased.fieldTypeSelect', {
        defaultMessage: 'Field type',
      }),
    []
  );

  const options = useMemo(() => {
    const fieldTypesTracker = new Set();
    const fieldTypes: Option[] = [];
    fields.forEach(({ type }) => {
      if (
        type !== undefined &&
        !fieldTypesTracker.has(type) &&
        ML_JOB_FIELD_TYPES_OPTIONS[type] !== undefined
      ) {
        const item = ML_JOB_FIELD_TYPES_OPTIONS[type];

        fieldTypesTracker.add(type);
        fieldTypes.push({
          value: type,
          name: (
            <EuiFlexGroup>
              <EuiFlexItem grow={true}> {item.name}</EuiFlexItem>
              {type && (
                <EuiFlexItem grow={false}>
                  <FieldTypeIcon
                    type={type}
                    fieldName={item.name}
                    tooltipEnabled={false}
                    needsAria={true}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ),
        });
      }
    });
    return fieldTypes;
  }, [fields]);
  return (
    <MultiSelectPicker
      title={fieldNameTitle}
      options={options}
      onChange={setVisibleFieldTypes}
      checkedOptions={visibleFieldTypes}
      dataTestSubj={'mlDataVisualizerFieldTypeSelect'}
    />
  );
};
