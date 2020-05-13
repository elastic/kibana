/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiSpacer, EuiButtonGroup } from '@elastic/eui';
import { ComponentStrings } from '../../../i18n';
import { FontPicker } from '../font_picker';
import { ColorPickerPopover } from '../color_picker_popover';
import { fontSizes } from './font_sizes';

const { TextStylePicker: strings } = ComponentStrings;

export const TextStylePicker = ({
  family,
  size,
  align,
  color,
  weight,
  underline,
  italic,
  onChange,
  colors,
}) => {
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

  const stylesSelectedMap = {
    ['bold']: weight === 'bold',
    ['italic']: Boolean(italic),
    ['underline']: Boolean(underline),
  };

  if (!isNaN(size) && fontSizes.indexOf(Number(size)) === -1) {
    fontSizes.push(Number(size));
    fontSizes.sort((a, b) => a - b);
  }

  const doChange = (propName, value) => {
    onChange({
      family,
      size,
      align,
      color,
      weight: weight || 'normal',
      underline: underline || false,
      italic: italic || false,
      [propName]: value,
    });
  };

  const onAlignmentChange = optionId => doChange('align', optionId);

  const onStyleChange = optionId => {
    let prop;
    let value;

    if (optionId === 'bold') {
      prop = 'weight';
      value = !stylesSelectedMap[optionId] ? 'bold' : 'normal';
    } else {
      prop = optionId;
      value = !stylesSelectedMap[optionId];
    }

    doChange(prop, value);
  };

  return (
    <div className="canvasTextStylePicker">
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <FontPicker value={family} onSelect={value => doChange('family', value)} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            value={size}
            onChange={e => doChange('size', Number(e.target.value))}
            options={fontSizes.map(size => ({ text: String(size), value: size }))}
            prepend="Size"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false} style={{ fontSize: 0 }}>
          <ColorPickerPopover
            value={color}
            onChange={value => doChange('color', value)}
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
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            options={alignmentButtons}
            buttonSize="compressed"
            isIconOnly
            idSelected={align}
            onChange={onAlignmentChange}
            className="canvasSidebar__buttonGroup"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

TextStylePicker.propTypes = {
  family: PropTypes.string,
  size: PropTypes.number,
  align: PropTypes.string,
  color: PropTypes.string,
  weight: PropTypes.string,
  underline: PropTypes.bool,
  italic: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  colors: PropTypes.array,
};

TextStylePicker.defaultProps = {
  align: 'left',
  size: 14,
};
