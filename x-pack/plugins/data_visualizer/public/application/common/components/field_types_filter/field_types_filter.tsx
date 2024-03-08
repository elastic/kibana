/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getFieldTypeName } from '@kbn/field-utils';
import { FieldTypesHelpPopover } from './field_types_help_popover';
import type { Option } from '../multi_select_picker';
import { MultiSelectPicker } from '../multi_select_picker';
import type {
  FileBasedFieldVisConfig,
  FileBasedUnknownFieldVisConfig,
} from '../../../../../common/types/field_vis_config';
import { FieldTypeIcon } from '../field_type_icon';

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
      const label = getFieldTypeName(type);
      if (type !== undefined && !fieldTypesTracker.has(type) && label !== undefined) {
        fieldTypesTracker.add(type);
        fieldTypes.push({
          value: type,
          name: (
            <EuiFlexGroup>
              <EuiFlexItem grow={true}> {label}</EuiFlexItem>
              {type && (
                <EuiFlexItem grow={false}>
                  <FieldTypeIcon type={type} tooltipEnabled={false} />
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
      postfix={<FieldTypesHelpPopover fieldTypes={options.map((f) => f.value)} />}
    />
  );
};
