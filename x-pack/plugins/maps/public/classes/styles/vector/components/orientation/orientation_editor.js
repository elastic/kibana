/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StylePropEditor } from '../style_prop_editor';
import { DynamicOrientationForm } from './dynamic_orientation_form';
import { StaticOrientationForm } from './static_orientation_form';

export function OrientationEditor(props) {
  const orientationForm = props.styleProperty.isDynamic() ? (
    <DynamicOrientationForm {...props} />
  ) : (
    <StaticOrientationForm {...props} />
  );

  return <StylePropEditor {...props}>{orientationForm}</StylePropEditor>;
}
