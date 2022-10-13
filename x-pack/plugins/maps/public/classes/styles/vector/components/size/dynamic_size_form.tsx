/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FieldSelect } from '../field_select';
import { SizeRangeSelector } from './size_range_selector';
import { SizeDynamicOptions } from '../../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { DynamicSizeProperty } from '../../properties/dynamic_size_property';
import { StyleField } from '../../style_fields_helper';

interface Props {
  fields: StyleField[];
  onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: SizeDynamicOptions) => void;
  staticDynamicSelect?: ReactNode;
  styleProperty: DynamicSizeProperty;
}

export function DynamicSizeForm({
  fields,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
}: Props) {
  const styleOptions = styleProperty.getOptions();

  const onFieldChange = ({ field }: { field: StyleField | null }) => {
    if (field) {
      onDynamicStyleChange(styleProperty.getStyleName(), {
        ...styleOptions,
        field: { name: field.name, origin: field.origin },
      });
    }
  };

  const onSizeRangeChange = ({ minSize, maxSize }: { minSize: number; maxSize: number }) => {
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      minSize,
      maxSize,
    });
  };

  let sizeRange;
  if (styleOptions.field && styleOptions.field.name) {
    sizeRange = (
      <SizeRangeSelector
        onChange={onSizeRangeChange}
        minSize={styleOptions.minSize}
        maxSize={styleOptions.maxSize}
        showLabels
        compressed
      />
    );
  }

  return (
    <Fragment>
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
      <EuiSpacer size="s" />
      {sizeRange}
    </Fragment>
  );
}
