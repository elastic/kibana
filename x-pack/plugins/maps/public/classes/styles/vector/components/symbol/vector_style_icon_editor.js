/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StylePropEditor } from '../style_prop_editor';
import { DynamicIconForm } from './dynamic_icon_form';
import { StaticIconForm } from './static_icon_form';

export function VectorStyleIconEditor(props) {
  const iconForm = props.styleProperty.isDynamic() ? (
    <DynamicIconForm {...props} />
  ) : (
    <StaticIconForm {...props} />
  );

  return <StylePropEditor {...props}>{iconForm}</StylePropEditor>;
}
