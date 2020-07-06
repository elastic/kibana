/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StylePropEditor } from '../style_prop_editor';
import { DynamicColorForm } from './dynamic_color_form';
import { StaticColorForm } from './static_color_form';
import { i18n } from '@kbn/i18n';

export function VectorStyleColorEditor(props) {
  const colorForm = props.styleProperty.isDynamic() ? (
    <DynamicColorForm {...props} />
  ) : (
    <StaticColorForm {...props} />
  );

  return (
    <StylePropEditor
      {...props}
      customStaticOptionLabel={i18n.translate(
        'xpack.maps.styles.color.staticDynamicSelect.staticLabel',
        {
          defaultMessage: 'Solid',
        }
      )}
    >
      {colorForm}
    </StylePropEditor>
  );
}
