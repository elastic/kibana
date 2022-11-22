/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { ChangeEvent, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { FieldSelect } from '../field_select';
import { ColorMapSelect } from './color_map_select';
import { OtherCategoryColorPicker } from './other_category_color_picker';
import {
  CategoryColorStop,
  ColorDynamicOptions,
  OrdinalColorStop,
} from '../../../../../../common/descriptor_types';
import {
  CATEGORICAL_DATA_TYPES,
  COLOR_MAP_TYPE,
  VECTOR_STYLES,
} from '../../../../../../common/constants';
import { StyleField } from '../../style_fields_helper';
import { DynamicColorProperty } from '../../properties/dynamic_color_property';

interface Props {
  fields: StyleField[];
  onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: ColorDynamicOptions) => void;
  staticDynamicSelect?: ReactNode;
  styleProperty: DynamicColorProperty;
  swatches: string[];
}

export function DynamicColorForm({
  fields,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
  swatches,
}: Props) {
  const styleOptions = styleProperty.getOptions();

  const onColorMapSelect = ({
    color,
    customColorMap,
    type,
    useCustomColorMap,
  }: {
    color?: null | string;
    customColorMap?: OrdinalColorStop[] | CategoryColorStop[];
    type: COLOR_MAP_TYPE;
    useCustomColorMap: boolean;
  }) => {
    const newColorOptions = {
      ...styleOptions,
      type,
    };
    if (type === COLOR_MAP_TYPE.ORDINAL) {
      newColorOptions.useCustomColorRamp = useCustomColorMap;
      if (customColorMap) {
        newColorOptions.customColorRamp = customColorMap as OrdinalColorStop[];
      }
      if (color) {
        newColorOptions.color = color;
      }
    } else {
      newColorOptions.useCustomColorPalette = useCustomColorMap;
      if (customColorMap) {
        newColorOptions.customColorPalette = customColorMap as CategoryColorStop[];
      }
      if (color) {
        newColorOptions.colorCategory = color;
      }
    }

    onDynamicStyleChange(styleProperty.getStyleName(), newColorOptions);
  };

  const onFieldChange = ({ field }: { field: StyleField | null }) => {
    if (!field) {
      return;
    }

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

  const onColorMapTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const colorMapType = e.target.value as COLOR_MAP_TYPE;
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      type: colorMapType,
    });
  };

  const onOtherCategoryColorChange = (color: string) => {
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      otherCategoryColor: color,
    });
  };

  const onInvertChange = (event: EuiSwitchEvent) => {
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      invert: event.target.checked,
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

    const invert = styleOptions.invert === undefined ? false : styleOptions.invert;
    const showColorMapTypeToggle = !CATEGORICAL_DATA_TYPES.includes(field.type);

    return styleProperty.isOrdinal() ? (
      <>
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
          invert={invert}
        />
        {!!styleOptions.useCustomColorRamp ? null : (
          <EuiFormRow display="columnCompressedSwitch">
            <EuiSwitch
              label={i18n.translate('xpack.maps.style.revereseColorsLabel', {
                defaultMessage: `Reverse colors`,
              })}
              checked={invert}
              onChange={onInvertChange}
              compressed
            />
          </EuiFormRow>
        )}
      </>
    ) : (
      <>
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
          invert={false}
        />
        <OtherCategoryColorPicker
          onChange={onOtherCategoryColorChange}
          color={styleOptions.otherCategoryColor}
        />
      </>
    );
  };

  return (
    <>
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
        <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
          {staticDynamicSelect ? staticDynamicSelect : null}
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
    </>
  );
}
