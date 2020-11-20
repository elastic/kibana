/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Props, StylePropEditor } from '../style_prop_editor';
// @ts-expect-error
import { DynamicLabelForm } from './dynamic_label_form';
// @ts-expect-error
import { StaticLabelForm } from './static_label_form';
import { LabelDynamicOptions, LabelStaticOptions } from '../../../../../../common/descriptor_types';

type LabelEditorProps = Omit<Props<LabelStaticOptions, LabelDynamicOptions>, 'children'>;

export function VectorStyleLabelEditor(props: LabelEditorProps) {
  const labelForm = props.styleProperty.isDynamic() ? (
    <DynamicLabelForm {...props} />
  ) : (
    <StaticLabelForm {...props} />
  );

  return <StylePropEditor {...props}>{labelForm}</StylePropEditor>;
}
