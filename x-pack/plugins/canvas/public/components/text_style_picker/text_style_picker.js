/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiSpacer, EuiButtonGroup } from '@elastic/eui';
import { FontPicker } from '../font_picker';
import { ColorPickerPopover } from '../color_picker_popover';
import { fontSizes } from './font_sizes';

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
      label: 'Align left',
      iconType: 'editorAlignLeft',
    },
    {
      id: 'center',
      label: 'Align center',
      iconType: 'editorAlignCenter',
    },
    {
      id: 'right',
      label: 'Align right',
      iconType: 'editorAlignRight',
    },
  ];

  const styleButtons = [
    {
      id: 'bold',
      label: 'Bold',
      iconType: 'editorBold',
    },
    {
      id: 'italic',
      label: 'Italic',
      iconType: 'editorItalic',
    },
    {
      id: 'underline',
      label: 'Underline',
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
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            value={size}
            onChange={e => doChange('size', Number(e.target.value))}
            options={fontSizes.map(size => ({ text: String(size), value: size }))}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <FontPicker value={family} onSelect={value => doChange('family', value)} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            options={styleButtons}
            idToSelectedMap={stylesSelectedMap}
            onChange={onStyleChange}
            type="multi"
            isIconOnly
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            options={alignmentButtons}
            isIconOnly
            idSelected={align}
            onChange={onAlignmentChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ fontSize: 0 }}>
          <ColorPickerPopover
            value={color}
            onChange={value => doChange('color', value)}
            colors={colors}
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
