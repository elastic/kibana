/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { CustomIcon, IconStaticOptions } from '../../../../../../common/descriptor_types';
import { IconSelect } from './icon_select';
import { StaticIconProperty } from '../../properties/static_icon_property';

interface Props {
  customIcons: CustomIcon[];
  onCustomIconsChange: (customIcons: CustomIcon[]) => void;
  onStaticStyleChange: (propertyName: VECTOR_STYLES, options: IconStaticOptions) => void;
  staticDynamicSelect?: ReactNode;
  styleProperty: StaticIconProperty;
}

export function StaticIconForm({
  onStaticStyleChange,
  onCustomIconsChange,
  customIcons,
  staticDynamicSelect,
  styleProperty,
}: Props) {
  const onChange = ({ selectedIconId }: { selectedIconId: string }) => {
    onStaticStyleChange(styleProperty.getStyleName(), {
      value: selectedIconId,
    });
  };

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
        {staticDynamicSelect}
      </EuiFlexItem>
      <EuiFlexItem>
        <IconSelect
          customIcons={customIcons}
          onChange={onChange}
          onCustomIconsChange={onCustomIconsChange}
          icon={styleProperty.getOptions()}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
