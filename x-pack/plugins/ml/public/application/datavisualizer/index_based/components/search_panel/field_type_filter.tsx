/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Option, MultiSelectPicker } from '../../../../components/multi_select_picker';
import { FieldTypeIcon } from '../../../../components/field_type_icon';
import { ML_JOB_FIELD_TYPES } from '../../../../../../common/constants/field_types';
import type { MlJobFieldType } from '../../../../../../common/types/field_types';

export const ML_JOB_FIELD_TYPES_OPTIONS = {
  [ML_JOB_FIELD_TYPES.BOOLEAN]: { name: 'Boolean', icon: 'tokenBoolean' },
  [ML_JOB_FIELD_TYPES.DATE]: { name: 'Date', icon: 'tokenDate' },
  [ML_JOB_FIELD_TYPES.GEO_POINT]: { name: 'Geo point', icon: 'tokenGeo' },
  [ML_JOB_FIELD_TYPES.IP]: { name: 'IP address', icon: 'tokenIP' },
  [ML_JOB_FIELD_TYPES.KEYWORD]: { name: 'Keyword', icon: 'tokenKeyword' },
  [ML_JOB_FIELD_TYPES.NUMBER]: { name: 'Number', icon: 'tokenNumber' },
  [ML_JOB_FIELD_TYPES.TEXT]: { name: 'Text', icon: 'tokenString' },
  [ML_JOB_FIELD_TYPES.UNKNOWN]: { name: 'Unknown' },
};

export const DatavisualizerFieldTypeFilter: FC<{
  indexedFieldTypes: MlJobFieldType[];
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
      i18n.translate('xpack.ml.dataVisualizer.indexBased.fieldTypeSelect', {
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
      dataTestSubj={'mlDataVisualizerFieldTypeSelect'}
    />
  );
};
