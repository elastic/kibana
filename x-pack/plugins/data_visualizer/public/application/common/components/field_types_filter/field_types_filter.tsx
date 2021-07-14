/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { MultiSelectPicker, Option } from '../multi_select_picker';
import type {
  FileBasedFieldVisConfig,
  FileBasedUnknownFieldVisConfig,
} from '../stats_table/types/field_vis_config';
import { FieldTypeIcon } from '../field_type_icon';
import { JOB_FIELD_TYPES_OPTIONS } from '../../../../../common';

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
      i18n.translate('xpack.dataVisualizer.fieldTypeSelect', {
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
        JOB_FIELD_TYPES_OPTIONS[type] !== undefined
      ) {
        const item = JOB_FIELD_TYPES_OPTIONS[type];

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
      dataTestSubj={'dataVisualizerFieldTypeSelect'}
    />
  );
};
