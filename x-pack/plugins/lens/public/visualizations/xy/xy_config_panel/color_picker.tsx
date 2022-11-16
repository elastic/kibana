/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import chroma from 'chroma-js';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiColorPicker,
  EuiColorPickerProps,
  EuiToolTip,
  EuiIcon,
  euiPaletteColorBlind,
} from '@elastic/eui';
import { TooltipWrapper } from '../../../shared_components';

const tooltipContent = {
  auto: i18n.translate('xpack.lens.configPanel.color.tooltip.auto', {
    defaultMessage: 'Lens automatically picks colors for you unless you specify a custom color.',
  }),
  custom: i18n.translate('xpack.lens.configPanel.color.tooltip.custom', {
    defaultMessage: 'Clear the custom color to return to “Auto” mode.',
  }),
  disabled: i18n.translate('xpack.lens.configPanel.color.tooltip.disabled', {
    defaultMessage:
      'You are unable to apply custom colors to individual series when the layer includes a "Break down by" field.',
  }),
};

// copied from coloring package
function isValidPonyfill(colorString: string) {
  // we're using an old version of chroma without the valid function
  try {
    chroma(colorString);
    return true;
  } catch (e) {
    return false;
  }
}

export function isValidColor(colorString?: string) {
  // chroma can handle also hex values with alpha channel/transparency
  // chroma accepts also hex without #, so test for it
  return (
    colorString && colorString !== '' && /^#/.test(colorString) && isValidPonyfill(colorString)
  );
}

const getColorAlpha = (color?: string | null) =>
  (color && isValidColor(color) && chroma(color)?.alpha()) || 1;

export const ColorPicker = ({
  label,
  disableHelpTooltip,
  disabled,
  setConfig,
  defaultColor,
  overwriteColor,
  showAlpha,
}: {
  overwriteColor?: string | null;
  defaultColor?: string | null;
  setConfig: (config: { color?: string }) => void;
  label?: string;
  disableHelpTooltip?: boolean;
  disabled?: boolean;
  showAlpha?: boolean;
}) => {
  const [colorText, setColorText] = useState(overwriteColor || defaultColor);
  const [validatedColor, setValidatedColor] = useState(overwriteColor || defaultColor);
  const [currentColorAlpha, setCurrentColorAlpha] = useState(getColorAlpha(colorText));
  const unflushedChanges = useRef(false);

  useEffect(() => {
    //  only the changes from outside the color picker should be applied
    if (!unflushedChanges.current) {
      // something external changed the color that is currently selected (switching from annotation line to annotation range)
      if (
        overwriteColor &&
        validatedColor &&
        overwriteColor.toUpperCase() !== validatedColor.toUpperCase()
      ) {
        setColorText(overwriteColor);
        setValidatedColor(overwriteColor.toUpperCase());
        setCurrentColorAlpha(getColorAlpha(overwriteColor));
      }
    }
    unflushedChanges.current = false;
  }, [validatedColor, overwriteColor, defaultColor]);

  const handleColor: EuiColorPickerProps['onChange'] = (text, output) => {
    setColorText(text);
    unflushedChanges.current = true;
    if (output.isValid) {
      setValidatedColor(output.hex.toUpperCase());
      setCurrentColorAlpha(getColorAlpha(output.hex));
      setConfig({ color: output.hex });
    }
    if (text === '') {
      setConfig({ color: undefined });
    }
  };

  const inputLabel =
    label ??
    i18n.translate('xpack.lens.xyChart.seriesColor.label', {
      defaultMessage: 'Series color',
    });

  const colorPicker = (
    <EuiColorPicker
      fullWidth
      data-test-subj="indexPattern-dimension-colorPicker"
      compressed
      isClearable={Boolean(overwriteColor)}
      onChange={handleColor}
      color={disabled ? '' : colorText}
      disabled={disabled}
      placeholder={
        defaultColor?.toUpperCase() ||
        i18n.translate('xpack.lens.xyChart.seriesColor.auto', {
          defaultMessage: 'Auto',
        })
      }
      aria-label={inputLabel}
      showAlpha={showAlpha}
      swatches={
        currentColorAlpha === 1
          ? euiPaletteColorBlind()
          : euiPaletteColorBlind().map((c) => chroma(c).alpha(currentColorAlpha).hex())
      }
    />
  );

  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={
        <TooltipWrapper
          delay="long"
          position="top"
          tooltipContent={colorText && !disabled ? tooltipContent.custom : tooltipContent.auto}
          condition={!disableHelpTooltip}
        >
          <span>
            {inputLabel}
            {!disableHelpTooltip && (
              <>
                <EuiIcon
                  type="questionInCircle"
                  color="subdued"
                  size="s"
                  className="eui-alignTop"
                />
              </>
            )}
          </span>
        </TooltipWrapper>
      }
    >
      {disabled ? (
        <EuiToolTip
          position="top"
          content={tooltipContent.disabled}
          delay="long"
          anchorClassName="eui-displayBlock"
        >
          {colorPicker}
        </EuiToolTip>
      ) : (
        colorPicker
      )}
    </EuiFormRow>
  );
};
