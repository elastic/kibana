/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ValidatedRange } from '../../../../../components/validated_range';
import { SizeStaticOptions } from '../../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { StaticSizeProperty } from '../../properties/static_size_property';

interface Props {
  onStaticStyleChange: (propertyName: VECTOR_STYLES, options: SizeStaticOptions) => void;
  staticDynamicSelect?: ReactNode;
  styleProperty: StaticSizeProperty;
}

export function StaticSizeForm({ onStaticStyleChange, staticDynamicSelect, styleProperty }: Props) {
  const onSizeChange = (size: number) => {
    onStaticStyleChange(styleProperty.getStyleName(), { size });
  };

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
        {staticDynamicSelect}
      </EuiFlexItem>
      <EuiFlexItem>
        <ValidatedRange
          min={0}
          max={100}
          value={styleProperty.getOptions().size}
          onChange={onSizeChange}
          showInput="inputWithPopover"
          showLabels
          compressed
          append={i18n.translate('xpack.maps.vector.size.unitLabel', {
            defaultMessage: 'px',
            description: 'Shorthand for pixel',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
