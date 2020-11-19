/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Props, StylePropEditor } from '../style_prop_editor';
// @ts-expect-error
import { DynamicSizeForm } from './dynamic_size_form';
// @ts-expect-error
import { StaticSizeForm } from './static_size_form';
import { SizeDynamicOptions, SizeStaticOptions } from '../../../../../../common/descriptor_types';

type SizeEditorProps = Omit<Props<SizeStaticOptions, SizeDynamicOptions>, 'children'>;

export function VectorStyleSizeEditor(props: SizeEditorProps) {
  const sizeForm = props.styleProperty.isDynamic() ? (
    <DynamicSizeForm {...props} />
  ) : (
    <StaticSizeForm {...props} />
  );

  return <StylePropEditor {...props}>{sizeForm}</StylePropEditor>;
}
