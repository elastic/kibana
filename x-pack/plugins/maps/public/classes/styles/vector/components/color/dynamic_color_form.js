/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import { FieldSelect } from '../field_select';
import { ColorMapSelect } from './color_map_select';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CATEGORICAL_DATA_TYPES, COLOR_MAP_TYPE } from '../../../../../../common/constants';

export function DynamicColorForm({
  fields,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
  swatches,
}) {
  const styleOptions = styleProperty.getOptions();

  const onColorMapSelect = ({ color, customColorMap, type, useCustomColorMap }) => {
    const newColorOptions = {
      ...styleOptions,
      type,
    };
    if (type === COLOR_MAP_TYPE.ORDINAL) {
      newColorOptions.useCustomColorRamp = useCustomColorMap;
      if (customColorMap) {
        newColorOptions.customColorRamp = customColorMap;
      }
      if (color) {
        newColorOptions.color = color;
      }
    } else {
      newColorOptions.useCustomColorPalette = useCustomColorMap;
      if (customColorMap) {
        newColorOptions.customColorPalette = customColorMap;
      }
      if (color) {
        newColorOptions.colorCategory = color;
      }
    }

    onDynamicStyleChange(styleProperty.getStyleName(), newColorOptions);
  };

  const onFieldChange = async ({ field }) => {
    const { name, origin, type: fieldType } = field;
    const defaultColorMapType = CATEGORICAL_DATA_TYPES.includes(fieldType)
      ? COLOR_MAP_TYPE.CATEGORICAL
      : COLOR_MAP_TYPE.ORDINAL;
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      field: { name, origin },
      type: defaultColorMapType,
    });
  };

  const onColorMapTypeChange = async (e) => {
    const colorMapType = e.target.value;
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      type: colorMapType,
    });
  };

  const getField = () => {
    const fieldName = styleProperty.getFieldName();
    if (!fieldName) {
      return null;
    }

    return fields.find((field) => {
      return field.name === fieldName;
    });
  };

  const renderColorMapSelect = () => {
    const field = getField();
    if (!field) {
      return null;
    }

    const showColorMapTypeToggle = !CATEGORICAL_DATA_TYPES.includes(field.type);

    if (styleProperty.isOrdinal()) {
      return (
        <ColorMapSelect
          isCustomOnly={!field.supportsAutoDomain}
          onChange={onColorMapSelect}
          onColorMapTypeChange={onColorMapTypeChange}
          colorMapType={COLOR_MAP_TYPE.ORDINAL}
          colorPaletteId={styleOptions.color}
          customColorMap={styleOptions.customColorRamp}
          useCustomColorMap={_.get(styleOptions, 'useCustomColorRamp', false)}
          styleProperty={styleProperty}
          showColorMapTypeToggle={showColorMapTypeToggle}
          swatches={swatches}
        />
      );
    } else if (styleProperty.isCategorical()) {
      return (
        <ColorMapSelect
          isCustomOnly={!field.supportsAutoDomain}
          onColorMapTypeChange={onColorMapTypeChange}
          onChange={onColorMapSelect}
          colorMapType={COLOR_MAP_TYPE.CATEGORICAL}
          colorPaletteId={styleOptions.colorCategory}
          customColorMap={styleOptions.customColorPalette}
          useCustomColorMap={_.get(styleOptions, 'useCustomColorPalette', false)}
          styleProperty={styleProperty}
          showColorMapTypeToggle={showColorMapTypeToggle}
          swatches={swatches}
        />
      );
    }
  };

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
        <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
          {staticDynamicSelect}
        </EuiFlexItem>
        <EuiFlexItem>
          <FieldSelect
            styleName={styleProperty.getStyleName()}
            fields={fields}
            selectedFieldName={styleProperty.getFieldName()}
            onChange={onFieldChange}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {renderColorMapSelect()}
    </Fragment>
  );
}
