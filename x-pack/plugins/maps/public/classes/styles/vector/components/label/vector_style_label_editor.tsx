/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  LabelDynamicOptions,
  LabelStaticOptions,
} from '../../../../../../common/descriptor_types/style_property_descriptor_types';
import type { Props } from '../style_prop_editor';
import { StylePropEditor } from '../style_prop_editor';
// @ts-expect-error
import { DynamicLabelForm } from './dynamic_label_form';
// @ts-expect-error
import { StaticLabelForm } from './static_label_form';

type LabelEditorProps = Omit<Props<LabelStaticOptions, LabelDynamicOptions>, 'children'>;

export function VectorStyleLabelEditor(props: LabelEditorProps) {
  const labelForm = props.styleProperty.isDynamic() ? (
    <DynamicLabelForm {...props} />
  ) : (
    <StaticLabelForm {...props} />
  );

  return <StylePropEditor {...props}>{labelForm}</StylePropEditor>;
}
