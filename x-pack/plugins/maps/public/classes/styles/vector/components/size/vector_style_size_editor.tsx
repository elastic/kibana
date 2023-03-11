/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Props, StylePropEditor } from '../style_prop_editor';
import { DynamicSizeForm } from './dynamic_size_form';
import { StaticSizeForm } from './static_size_form';
import { SizeDynamicOptions, SizeStaticOptions } from '../../../../../../common/descriptor_types';
import { DynamicSizeProperty } from '../../properties/dynamic_size_property';
import { StaticSizeProperty } from '../../properties/static_size_property';

type SizeEditorProps = Omit<Props<SizeStaticOptions, SizeDynamicOptions>, 'children'>;

export function VectorStyleSizeEditor(props: SizeEditorProps) {
  const sizeForm = props.styleProperty.isDynamic() ? (
    <DynamicSizeForm {...props} styleProperty={props.styleProperty as DynamicSizeProperty} />
  ) : (
    <StaticSizeForm {...props} styleProperty={props.styleProperty as StaticSizeProperty} />
  );

  return <StylePropEditor {...props}>{sizeForm}</StylePropEditor>;
}
