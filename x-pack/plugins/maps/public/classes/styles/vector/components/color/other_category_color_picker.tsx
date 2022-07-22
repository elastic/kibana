/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { MbValidatedColorPicker } from './mb_validated_color_picker';
import { OTHER_CATEGORY_LABEL, OTHER_CATEGORY_DEFAULT_COLOR } from '../../style_util';

const OTHER_CATEGORY_SWATCHES = [
  euiThemeVars.euiColorLightestShade,
  euiThemeVars.euiColorLightShade,
  euiThemeVars.euiColorMediumShade,
  euiThemeVars.euiColorDarkShade,
  euiThemeVars.euiColorDarkestShade,
];

interface Props {
  onChange: (color: string) => void;
  color?: string;
}

export function OtherCategoryColorPicker(props: Props) {
    return (
      <MbValidatedColorPicker
        swatches={OTHER_CATEGORY_SWATCHES}
        prepend={OTHER_CATEGORY_LABEL} 
        onChange={props.onChange}
        color={props.color ? props.color : OTHER_CATEGORY_DEFAULT_COLOR}
        compressed={true}
      />
    )
}