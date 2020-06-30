/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FieldSelect } from '../field_select';

export function DynamicLabelForm({
  fields,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
}) {
  const styleOptions = styleProperty.getOptions();

  const onFieldChange = ({ field }) => {
    onDynamicStyleChange(styleProperty.getStyleName(), { ...styleOptions, field });
  };

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
        {staticDynamicSelect}
      </EuiFlexItem>
      <EuiFlexItem>
        <FieldSelect
          styleName={styleProperty.getStyleName()}
          fields={fields}
          selectedFieldName={styleProperty.getFieldName()}
          onChange={onFieldChange}
          compressed
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
