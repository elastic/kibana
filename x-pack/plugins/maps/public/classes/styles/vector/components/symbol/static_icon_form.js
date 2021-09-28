/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { IconSelect } from './icon_select';

export function StaticIconForm({ onStaticStyleChange, onCustomIconsChange, customIcons, staticDynamicSelect, styleProperty }) {
  const onChange = ({ selectedIconId, icon, label }) => {
    onStaticStyleChange(styleProperty.getStyleName(), { value: selectedIconId, icon, label });
  };

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
        {staticDynamicSelect}
      </EuiFlexItem>
      <EuiFlexItem>
        <IconSelect customIcons={customIcons} onChange={onChange} onCustomIconsChange={onCustomIconsChange} label={styleProperty.getOptions().value} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
