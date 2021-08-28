/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type {
  ColorDynamicOptions,
  ColorStaticOptions,
} from '../../../../../../common/descriptor_types/style_property_descriptor_types';
import type { Props } from '../style_prop_editor';
import { StylePropEditor } from '../style_prop_editor';
// @ts-expect-error
import { DynamicColorForm } from './dynamic_color_form';
// @ts-expect-error
import { StaticColorForm } from './static_color_form';

type ColorEditorProps = Omit<Props<ColorStaticOptions, ColorDynamicOptions>, 'children'> & {
  swatches: string[];
};

export function VectorStyleColorEditor(props: ColorEditorProps) {
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
