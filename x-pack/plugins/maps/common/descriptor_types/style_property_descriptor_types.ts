/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import {
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  LABEL_BORDER_SIZES,
  SYMBOLIZE_AS_TYPES,
  VECTOR_STYLES,
  DATA_MAPPING_FUNCTION,
  STYLE_TYPE,
} from '../constants';

// Non-static/dynamic options
export type SymbolizeAsOptions = {
  value: SYMBOLIZE_AS_TYPES;
};

export type SymbolizeAsStylePropertyDescriptor = {
  options: SymbolizeAsOptions;
};

export type LabelBorderSizeOptions = {
  size: LABEL_BORDER_SIZES;
};

export type LabelBorderSizeStylePropertyDescriptor = {
  options: LabelBorderSizeOptions;
};

// Static/dynamic options

export type FieldMetaOptions = {
  isEnabled: boolean;
  sigma?: number;
  percentiles?: number[];
};

export type StylePropertyField = {
  name: string;
  origin: FIELD_ORIGIN;
};

export type OrdinalColorStop = {
  stop: number;
  color: string;
};

export type CategoryColorStop = {
  stop: string | null;
  color: string;
};

export type IconStop = {
  stop: string | null;
  icon: string;
};

export type ColorDynamicOptions = {
  // ordinal color properties
  color?: string; // TODO move color category ramps to constants and make ENUM type
  customColorRamp?: OrdinalColorStop[];
  useCustomColorRamp?: boolean;
  dataMappingFunction?: DATA_MAPPING_FUNCTION;

  // category color properties
  colorCategory?: string; // TODO move color category palettes to constants and make ENUM type
  customColorPalette?: CategoryColorStop[];
  useCustomColorPalette?: boolean;

  field?: StylePropertyField;
  fieldMetaOptions: FieldMetaOptions;

  type?: COLOR_MAP_TYPE;
};

export type ColorStaticOptions = {
  color: string;
};

export type ColorStaticStylePropertyDescriptor = {
  type: STYLE_TYPE.STATIC;
  options: ColorStaticOptions;
};

export type ColorDynamicStylePropertyDescriptor = {
  type: STYLE_TYPE.DYNAMIC;
  options: ColorDynamicOptions;
};

export type ColorStylePropertyDescriptor =
  | ColorStaticStylePropertyDescriptor
  | ColorDynamicStylePropertyDescriptor;

export type IconDynamicOptions = {
  iconPaletteId: string | null;
  customIconStops?: IconStop[];
  useCustomIconMap?: boolean;
  field?: StylePropertyField;
  fieldMetaOptions: FieldMetaOptions;
};

export type IconStaticOptions = {
  value: string; // icon id
};

export type IconStylePropertyDescriptor =
  | {
      type: STYLE_TYPE.STATIC;
      options: IconStaticOptions;
    }
  | {
      type: STYLE_TYPE.DYNAMIC;
      options: IconDynamicOptions;
    };

export type LabelDynamicOptions = {
  field?: StylePropertyField; // field containing label value
};

export type LabelStaticOptions = {
  value: string; // static label text
};

export type LabelStylePropertyDescriptor =
  | {
      type: STYLE_TYPE.STATIC;
      options: LabelStaticOptions;
    }
  | {
      type: STYLE_TYPE.DYNAMIC;
      options: LabelDynamicOptions;
    };

export type OrientationDynamicOptions = {
  field?: StylePropertyField;
  fieldMetaOptions: FieldMetaOptions;
};

export type OrientationStaticOptions = {
  orientation: number;
};

export type OrientationStylePropertyDescriptor =
  | {
      type: STYLE_TYPE.STATIC;
      options: OrientationStaticOptions;
    }
  | {
      type: STYLE_TYPE.DYNAMIC;
      options: OrientationDynamicOptions;
    };

export type SizeDynamicOptions = {
  minSize: number;
  maxSize: number;
  field?: StylePropertyField;
  fieldMetaOptions: FieldMetaOptions;
};

export type SizeStaticOptions = {
  size: number;
};

export type SizeStylePropertyDescriptor =
  | {
      type: STYLE_TYPE.STATIC;
      options: SizeStaticOptions;
    }
  | {
      type: STYLE_TYPE.DYNAMIC;
      options: SizeDynamicOptions;
    };

export type VectorStylePropertiesDescriptor = {
  [VECTOR_STYLES.SYMBOLIZE_AS]: SymbolizeAsStylePropertyDescriptor;
  [VECTOR_STYLES.FILL_COLOR]: ColorStylePropertyDescriptor;
  [VECTOR_STYLES.LINE_COLOR]: ColorStylePropertyDescriptor;
  [VECTOR_STYLES.LINE_WIDTH]: SizeStylePropertyDescriptor;
  [VECTOR_STYLES.ICON]: IconStylePropertyDescriptor;
  [VECTOR_STYLES.ICON_SIZE]: SizeStylePropertyDescriptor;
  [VECTOR_STYLES.ICON_ORIENTATION]: OrientationStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_TEXT]: LabelStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_COLOR]: ColorStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_SIZE]: SizeStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_BORDER_COLOR]: ColorStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_BORDER_SIZE]: LabelBorderSizeStylePropertyDescriptor;
};

export type StyleDescriptor = {
  type: string;
};

export type RangeFieldMeta = {
  min: number;
  max: number;
  delta: number;
  isMinOutsideStdRange?: boolean;
  isMaxOutsideStdRange?: boolean;
};

export type PercentilesFieldMeta = Array<{
  percentile: string;
  value: number;
}>;

export type Category = {
  key: string;
  count: number;
};

export type GeometryTypes = {
  isPointsOnly: boolean;
  isLinesOnly: boolean;
  isPolygonsOnly: boolean;
};

export type FieldMeta = {
  [key: string]: {
    range?: RangeFieldMeta;
    categories: Category[];
  };
};

export type StyleMetaDescriptor = {
  geometryTypes?: GeometryTypes;
  fieldMeta: FieldMeta;
};

export type VectorStyleDescriptor = StyleDescriptor & {
  properties: VectorStylePropertiesDescriptor;
  isTimeAware: boolean;
  __styleMeta?: StyleMetaDescriptor;
};

export type HeatmapStyleDescriptor = StyleDescriptor & {
  colorRampName: string;
};

export type StylePropertyOptions =
  | LabelBorderSizeOptions
  | SymbolizeAsOptions
  | DynamicStylePropertyOptions
  | StaticStylePropertyOptions;

export type StaticStylePropertyOptions =
  | ColorStaticOptions
  | IconStaticOptions
  | LabelStaticOptions
  | OrientationStaticOptions
  | SizeStaticOptions;

export type DynamicStylePropertyOptions =
  | ColorDynamicOptions
  | IconDynamicOptions
  | LabelDynamicOptions
  | OrientationDynamicOptions
  | SizeDynamicOptions;

export type DynamicStyleProperties = {
  type: STYLE_TYPE.DYNAMIC;
  options: DynamicStylePropertyOptions;
};
