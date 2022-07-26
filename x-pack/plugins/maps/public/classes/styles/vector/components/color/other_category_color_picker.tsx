/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiFormRow, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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
    <EuiFormRow>
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.maps.colorStops.otherCategoryColorPickerTooltip', {
          defaultMessage:
            'When the selected field has more terms than colors in the palette, the rest of the terms are grouped under "Other" category. Select a palette with more colors to increase the number of terms colored in your map',
        })}
      >
        <MbValidatedColorPicker
          swatches={OTHER_CATEGORY_SWATCHES}
          prepend={OTHER_CATEGORY_LABEL}
          onChange={props.onChange}
          color={props.color ? props.color : OTHER_CATEGORY_DEFAULT_COLOR}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}
