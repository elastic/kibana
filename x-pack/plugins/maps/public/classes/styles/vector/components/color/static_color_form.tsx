/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { ColorStaticOptions } from '../../../../../../common/descriptor_types';
import { MbValidatedColorPicker } from './mb_validated_color_picker';
import { StaticColorProperty } from '../../properties/static_color_property';

interface Props {
  onStaticStyleChange: (propertyName: VECTOR_STYLES, options: ColorStaticOptions) => void;
  staticDynamicSelect?: ReactNode;
  styleProperty: StaticColorProperty;
  swatches: string[];
}

export function StaticColorForm({
  onStaticStyleChange,
  staticDynamicSelect,
  styleProperty,
  swatches,
}: Props) {
  const onColorChange = (color: string) => {
    onStaticStyleChange(styleProperty.getStyleName(), { color });
  };

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
        {staticDynamicSelect ? staticDynamicSelect : null}
      </EuiFlexItem>
      <EuiFlexItem>
        <MbValidatedColorPicker
          onChange={onColorChange}
          color={styleProperty.getOptions().color}
          swatches={swatches}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
