/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { Props, StylePropEditor } from '../style_prop_editor';
// @ts-expect-error
import { DynamicColorForm } from './dynamic_color_form';
// @ts-expect-error
import { StaticColorForm } from './static_color_form';
import { ColorDynamicOptions, ColorStaticOptions } from '../../../../../../common/descriptor_types';

export function VectorStyleColorEditor(props: Props<ColorStaticOptions, ColorDynamicOptions>) {
  const colorForm = props.styleProperty.isDynamic() ? (
    <DynamicColorForm {...props} />
  ) : (
    <StaticColorForm {...props} />
  );

  return (
    <StylePropEditor<ColorStaticOptions, ColorDynamicOptions>
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
