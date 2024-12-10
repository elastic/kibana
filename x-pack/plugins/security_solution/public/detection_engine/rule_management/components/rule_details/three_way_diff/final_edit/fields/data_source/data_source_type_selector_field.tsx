/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup } from '@elastic/eui';
import { DataSourceType } from '../../../../../../../../../common/api/detection_engine/prebuilt_rules';
import type { FieldHook } from '../../../../../../../../shared_imports';
import type { ResetFormFn } from '../rule_field_edit_component_props';
import * as i18n from './translations';

interface DataSourceTypeSelectorFieldProps {
  field: FieldHook<string>;
  resetForm: ResetFormFn;
}

export function DataSourceTypeSelectorField({
  field,
  resetForm,
}: DataSourceTypeSelectorFieldProps): JSX.Element {
  const dataViewIndexPatternToggleButtonOptions: EuiButtonGroupOptionProps[] = useMemo(
    () => [
      {
        id: DataSourceType.index_patterns,
        label: i18n.INDEX_PATTERNS,
        iconType: field.value === DataSourceType.index_patterns ? 'checkInCircleFilled' : 'empty',
        'data-test-subj': `rule-index-toggle-${DataSourceType.index_patterns}`,
      },
      {
        id: DataSourceType.data_view,
        label: i18n.DATA_VIEW,
        iconType: field.value === DataSourceType.data_view ? 'checkInCircleFilled' : 'empty',
        'data-test-subj': `rule-index-toggle-${DataSourceType.data_view}`,
      },
    ],
    [field.value]
  );
  const handleDataSourceChange = useCallback(
    (optionId: string) => {
      field.setValue(optionId);
      resetForm({ resetValues: false });
    },
    [field, resetForm]
  );

  return (
    <EuiButtonGroup
      isFullWidth
      legend="Rule index pattern or data view selector"
      data-test-subj="dataSourceTypeButtonGroup"
      idSelected={field.value}
      onChange={handleDataSourceChange}
      options={dataViewIndexPatternToggleButtonOptions}
      color="primary"
    />
  );
}
