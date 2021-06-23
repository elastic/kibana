/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JOB_FIELD_TYPES, JobFieldType } from '../../../../../common';
import { FieldTypeIcon } from '../../../common/components/field_type_icon';
import { MultiSelectPicker, Option } from '../../../common/components/multi_select_picker';

const ML_JOB_FIELD_TYPES_OPTIONS = {
  [JOB_FIELD_TYPES.BOOLEAN]: { name: 'Boolean', icon: 'tokenBoolean' },
  [JOB_FIELD_TYPES.DATE]: { name: 'Date', icon: 'tokenDate' },
  [JOB_FIELD_TYPES.GEO_POINT]: { name: 'Geo point', icon: 'tokenGeo' },
  [JOB_FIELD_TYPES.GEO_SHAPE]: { name: 'Geo shape', icon: 'tokenGeo' },
  [JOB_FIELD_TYPES.IP]: { name: 'IP address', icon: 'tokenIP' },
  [JOB_FIELD_TYPES.KEYWORD]: { name: 'Keyword', icon: 'tokenKeyword' },
  [JOB_FIELD_TYPES.NUMBER]: { name: 'Number', icon: 'tokenNumber' },
  [JOB_FIELD_TYPES.TEXT]: { name: 'Text', icon: 'tokenString' },
  [JOB_FIELD_TYPES.UNKNOWN]: { name: 'Unknown' },
};

export const DatavisualizerFieldTypeFilter: FC<{
  indexedFieldTypes: JobFieldType[];
  setVisibleFieldTypes(q: string[]): void;
  visibleFieldTypes: string[];
}> = ({ indexedFieldTypes, setVisibleFieldTypes, visibleFieldTypes }) => {
  const options: Option[] = useMemo(() => {
    return indexedFieldTypes.map((indexedFieldName) => {
      const item = ML_JOB_FIELD_TYPES_OPTIONS[indexedFieldName];

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
