/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { IconSelect } from './icon_select';

export function StaticIconForm({ onStaticStyleChange, staticDynamicSelect, styleProperty }) {
  const onChange = (selectedIconId) => {
    onStaticStyleChange(styleProperty.getStyleName(), { value: selectedIconId });
  };

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
        {staticDynamicSelect}
      </EuiFlexItem>
      <EuiFlexItem>
        <IconSelect onChange={onChange} value={styleProperty.getOptions().value} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
