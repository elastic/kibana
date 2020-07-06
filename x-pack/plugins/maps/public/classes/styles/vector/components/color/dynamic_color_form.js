/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import { FieldSelect } from '../field_select';
import { ColorMapSelect } from './color_map_select';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CATEGORICAL_DATA_TYPES, COLOR_MAP_TYPE } from '../../../../../../common/constants';
import { COLOR_GRADIENTS, COLOR_PALETTES } from '../../../color_utils';
import { i18n } from '@kbn/i18n';

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
          colorMapOptions={COLOR_GRADIENTS}
          customOptionLabel={i18n.translate('xpack.maps.style.customColorRampLabel', {
            defaultMessage: 'Custom color ramp',
          })}
          onChange={onColorMapSelect}
          onColorMapTypeChange={onColorMapTypeChange}
          colorMapType={COLOR_MAP_TYPE.ORDINAL}
          color={styleOptions.color}
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
          colorMapOptions={COLOR_PALETTES}
          customOptionLabel={i18n.translate('xpack.maps.style.customColorPaletteLabel', {
            defaultMessage: 'Custom color palette',
          })}
          onColorMapTypeChange={onColorMapTypeChange}
          onChange={onColorMapSelect}
          colorMapType={COLOR_MAP_TYPE.CATEGORICAL}
          color={styleOptions.colorCategory}
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
