/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiSpacer, EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FontValue } from '@kbn/expressions-plugin';

import { FontPicker } from '../font_picker';
import { ColorPickerPopover } from '../color_picker_popover';
import { fontSizes } from './font_sizes';

const strings = {
  getAlignCenterOption: () =>
    i18n.translate('xpack.canvas.textStylePicker.alignCenterOption', {
      defaultMessage: 'Align center',
    }),
  getAlignLeftOption: () =>
    i18n.translate('xpack.canvas.textStylePicker.alignLeftOption', {
      defaultMessage: 'Align left',
    }),
  getAlignRightOption: () =>
    i18n.translate('xpack.canvas.textStylePicker.alignRightOption', {
      defaultMessage: 'Align right',
    }),
  getAlignmentOptionsControlLegend: () =>
    i18n.translate('xpack.canvas.textStylePicker.alignmentOptionsControl', {
      defaultMessage: 'Alignment options',
    }),
  getFontColorLabel: () =>
    i18n.translate('xpack.canvas.textStylePicker.fontColorLabel', {
      defaultMessage: 'Font Color',
    }),
  getStyleBoldOption: () =>
    i18n.translate('xpack.canvas.textStylePicker.styleBoldOption', {
      defaultMessage: 'Bold',
    }),
  getStyleItalicOption: () =>
    i18n.translate('xpack.canvas.textStylePicker.styleItalicOption', {
      defaultMessage: 'Italic',
    }),
  getStyleUnderlineOption: () =>
    i18n.translate('xpack.canvas.textStylePicker.styleUnderlineOption', {
      defaultMessage: 'Underline',
    }),
  getStyleOptionsControlLegend: () =>
    i18n.translate('xpack.canvas.textStylePicker.styleOptionsControl', {
      defaultMessage: 'Style options',
    }),
};

export interface StyleProps {
  family?: FontValue;
  size?: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
  weight?: 'bold' | 'normal';
  underline?: boolean;
  italic?: boolean;
}

export interface Props extends StyleProps {
  colors?: string[];
  onChange: (style: StyleProps) => void;
}

type StyleType = 'bold' | 'italic' | 'underline';

const alignmentButtons = [
  {
    id: 'left',
    label: strings.getAlignLeftOption(),
    iconType: 'editorAlignLeft',
  },
  {
    id: 'center',
    label: strings.getAlignCenterOption(),
    iconType: 'editorAlignCenter',
  },
  {
    id: 'right',
    label: strings.getAlignRightOption(),
    iconType: 'editorAlignRight',
  },
];

const styleButtons = [
  {
    id: 'bold',
    label: strings.getStyleBoldOption(),
    iconType: 'editorBold',
  },
  {
    id: 'italic',
    label: strings.getStyleItalicOption(),
    iconType: 'editorItalic',
  },
  {
    id: 'underline',
    label: strings.getStyleUnderlineOption(),
    iconType: 'editorUnderline',
  },
];

export const TextStylePicker: FC<Props> = ({
  align = 'left',
  color,
  colors,
  family,
  italic = false,
  onChange,
  size = 14,
  underline = false,
  weight = 'normal',
}) => {
  const [style, setStyle] = useState<StyleProps>({
    align,
    color,
    family,
    italic,
    size,
    underline,
    weight,
  });

  const stylesSelectedMap: Record<StyleType, boolean> = {
    ['bold']: weight === 'bold',
    ['italic']: Boolean(italic),
    ['underline']: Boolean(underline),
  };

  if (!isNaN(size) && fontSizes.indexOf(Number(size)) === -1) {
    fontSizes.push(Number(size));
    fontSizes.sort((a, b) => a - b);
  }

  const doChange = (propName: keyof StyleProps, value: string | boolean | number) => {
    const newStyle = { ...style, [propName]: value };
    setStyle(newStyle);
    onChange(newStyle);
  };

  const onStyleChange = (optionId: string) => {
    let prop: 'weight' | 'italic' | 'underline';
    let value;

    if (optionId === 'bold') {
      prop = 'weight';
      value = !stylesSelectedMap[optionId] ? 'bold' : 'normal';
    } else {
      prop = optionId as 'italic' | 'underline';
      value = !stylesSelectedMap[prop];
    }

    doChange(prop, value);
  };

  return (
    <div className="canvasTextStylePicker">
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          {family ? (
            <FontPicker value={family} onSelect={(value) => doChange('family', value)} />
          ) : (
            <FontPicker onSelect={(value) => doChange('family', value)} />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            value={size}
            onChange={(e) => doChange('size', Number(e.target.value))}
            options={fontSizes.map((fontSize) => ({ text: String(fontSize), value: fontSize }))}
            prepend="Size"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false} style={{ fontSize: 0 }}>
          <ColorPickerPopover
            value={color}
            onChange={(value) => doChange('color', value)}
            colors={colors}
            ariaLabel={strings.getFontColorLabel()}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            options={styleButtons}
            buttonSize="compressed"
            idToSelectedMap={stylesSelectedMap}
            onChange={onStyleChange}
            type="multi"
            isIconOnly
            className="canvasSidebar__buttonGroup"
            legend={strings.getStyleOptionsControlLegend()}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            options={alignmentButtons}
            buttonSize="compressed"
            isIconOnly
            idSelected={align}
            onChange={(optionId: string) => doChange('align', optionId)}
            className="canvasSidebar__buttonGroup"
            legend={strings.getAlignmentOptionsControlLegend()}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

TextStylePicker.propTypes = {
  family: PropTypes.string,
  size: PropTypes.number,
  align: PropTypes.oneOf(['left', 'center', 'right']),
  color: PropTypes.string,
  weight: PropTypes.oneOf(['normal', 'bold']),
  underline: PropTypes.bool,
  italic: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  colors: PropTypes.array,
};

TextStylePicker.defaultProps = {
  align: 'left',
  size: 14,
  weight: 'normal',
};
