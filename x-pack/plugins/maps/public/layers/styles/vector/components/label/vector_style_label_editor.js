/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StylePropEditor } from '../style_prop_editor';
import { DynamicLabelForm } from './dynamic_label_form';
import { StaticLabelForm } from './static_label_form';

export function VectorStyleLabelEditor(props) {
  const labelForm = props.styleProperty.isDynamic() ? (
    <DynamicLabelForm {...props} />
  ) : (
    <StaticLabelForm {...props} />
  );

  return <StylePropEditor {...props}>{labelForm}</StylePropEditor>;
}
