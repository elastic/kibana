/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { CSSProperties, ReactElement } from 'react';
import { FeatureIdentifier, Map as MbMap } from '@kbn/mapbox-gl';
import { FeatureCollection } from 'geojson';
import { StyleProperties, VectorStyleEditor } from './components/vector_style_editor';
import {
  getDefaultStaticProperties,
  LABEL_STYLES,
  LINE_STYLES,
  POLYGON_STYLES,
} from './vector_style_defaults';
import {
  DEFAULT_ICON,
  FIELD_ORIGIN,
  GEO_JSON_TYPE,
  ICON_SOURCE,
  KBN_IS_CENTROID_FEATURE,
  LAYER_STYLE_TYPE,
  SOURCE_FORMATTERS_DATA_REQUEST_ID,
  STYLE_TYPE,
  VECTOR_SHAPE_TYPE,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { StyleMeta } from './style_meta';
// @ts-expect-error
import { getMakiSymbol, PREFERRED_ICONS } from './symbol_utils';
import { VectorIcon } from './components/legend/vector_icon';
import { VectorStyleLegend } from './components/legend/vector_style_legend';
import { isOnlySingleFeatureType, getHasLabel } from './style_util';
import { StaticStyleProperty } from './properties/static_style_property';
import { DynamicStyleProperty, IDynamicStyleProperty } from './properties/dynamic_style_property';
import { DynamicSizeProperty } from './properties/dynamic_size_property';
import { StaticSizeProperty } from './properties/static_size_property';
import { StaticColorProperty } from './properties/static_color_property';
import { DynamicColorProperty } from './properties/dynamic_color_property';
import { StaticOrientationProperty } from './properties/static_orientation_property';
import { DynamicOrientationProperty } from './properties/dynamic_orientation_property';
import { StaticTextProperty } from './properties/static_text_property';
import { DynamicTextProperty } from './properties/dynamic_text_property';
import { LabelBorderSizeProperty } from './properties/label_border_size_property';
import { extractColorFromStyleProperty } from './components/legend/extract_color_from_style_property';
import { SymbolizeAsProperty } from './properties/symbolize_as_property';
import { StaticIconProperty } from './properties/static_icon_property';
import { DynamicIconProperty } from './properties/dynamic_icon_property';
import {
  ColorDynamicOptions,
  ColorStaticOptions,
  ColorStylePropertyDescriptor,
  CustomIcon,
  DynamicStyleProperties,
  DynamicStylePropertyOptions,
  IconDynamicOptions,
  IconStaticOptions,
  IconStylePropertyDescriptor,
  LabelDynamicOptions,
  LabelStaticOptions,
  LabelStylePropertyDescriptor,
  OrientationDynamicOptions,
  OrientationStaticOptions,
  OrientationStylePropertyDescriptor,
  SizeDynamicOptions,
  SizeStaticOptions,
  SizeStylePropertyDescriptor,
  StyleDescriptor,
  StyleMetaDescriptor,
  StylePropertyField,
  StylePropertyOptions,
  TileMetaFeature,
  VectorStyleDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../../common/descriptor_types';
import { DataRequest } from '../../util/data_request';
import { IStyle } from '../style';
import { IStyleProperty } from './properties/style_property';
import { IField } from '../../fields/field';
import { IVectorLayer } from '../../layers/vector_layer';
import { IVectorSource } from '../../sources/vector_source';
import { createStyleFieldsHelper, StyleFieldsHelper } from './style_fields_helper';
import { IESAggField } from '../../fields/agg';

const POINTS = [GEO_JSON_TYPE.POINT, GEO_JSON_TYPE.MULTI_POINT];
const LINES = [GEO_JSON_TYPE.LINE_STRING, GEO_JSON_TYPE.MULTI_LINE_STRING];
const POLYGONS = [GEO_JSON_TYPE.POLYGON, GEO_JSON_TYPE.MULTI_POLYGON];

export interface IVectorStyle extends IStyle {
  getAllStyleProperties(): Array<IStyleProperty<StylePropertyOptions>>;
  getDynamicPropertiesArray(): Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
  getSourceFieldNames(): string[];
  getStyleMeta(): StyleMeta;
  getDescriptorWithUpdatedStyleProps(
    nextFields: IField[],
    previousFields: IField[],
    mapColors: string[]
  ): Promise<{ hasChanges: boolean; nextStyleDescriptor?: VectorStyleDescriptor }>;
  getIsPointsOnly(): boolean;
  isTimeAware(): boolean;
  getPrimaryColor(): string;
  getIcon(showIncompleteIndicator: boolean): ReactElement;
  getIconSvg(symbolId: string): string | undefined;
  isUsingCustomIcon(symbolId: string): boolean;
  hasLegendDetails: () => Promise<boolean>;
  renderLegendDetails: () => ReactElement;
  clearFeatureState: (featureCollection: FeatureCollection, mbMap: MbMap, sourceId: string) => void;
  setFeatureStateAndStyleProps: (
    featureCollection: FeatureCollection,
    mbMap: MbMap,
    mbSourceId: string
  ) => boolean;
  arePointsSymbolizedAsCircles: () => boolean;
  setMBPaintProperties: ({
    alpha,
    mbMap,
    fillLayerId,
    lineLayerId,
  }: {
    alpha: number;
    mbMap: MbMap;
    fillLayerId: string;
    lineLayerId: string;
  }) => void;
  setMBPaintPropertiesForPoints: ({
    alpha,
    mbMap,
    pointLayerId,
  }: {
    alpha: number;
    mbMap: MbMap;
    pointLayerId: string;
  }) => void;
  setMBPropertiesForLabelText: ({
    alpha,
    mbMap,
    textLayerId,
  }: {
    alpha: number;
    mbMap: MbMap;
    textLayerId: string;
  }) => void;
  setMBSymbolPropertiesForPoints: ({
    mbMap,
    symbolLayerId,
    alpha,
  }: {
    alpha: number;
    mbMap: MbMap;
    symbolLayerId: string;
  }) => void;
}

export class VectorStyle implements IVectorStyle {
  private readonly _descriptor: VectorStyleDescriptor;
  private readonly _layer: IVectorLayer;
  private readonly _customIcons: CustomIcon[];
  private readonly _source: IVectorSource;
  private readonly _styleMeta: StyleMeta;

  private readonly _symbolizeAsStyleProperty: SymbolizeAsProperty;
  private readonly _lineColorStyleProperty: StaticColorProperty | DynamicColorProperty;
  private readonly _fillColorStyleProperty: StaticColorProperty | DynamicColorProperty;
  private readonly _lineWidthStyleProperty: StaticSizeProperty | DynamicSizeProperty;
  private readonly _iconStyleProperty: StaticIconProperty | DynamicIconProperty;
  private readonly _iconSizeStyleProperty: StaticSizeProperty | DynamicSizeProperty;
  private readonly _iconOrientationProperty: StaticOrientationProperty | DynamicOrientationProperty;
  private readonly _labelStyleProperty: StaticTextProperty | DynamicTextProperty;
  private readonly _labelSizeStyleProperty: StaticSizeProperty | DynamicSizeProperty;
  private readonly _labelColorStyleProperty: StaticColorProperty | DynamicColorProperty;
  private readonly _labelBorderColorStyleProperty: StaticColorProperty | DynamicColorProperty;
  private readonly _labelBorderSizeStyleProperty: LabelBorderSizeProperty;

  static createDescriptor(
    properties: Partial<VectorStylePropertiesDescriptor> = {},
    isTimeAware = true
  ) {
    return {
      type: LAYER_STYLE_TYPE.VECTOR,
      properties: { ...getDefaultStaticProperties(), ...properties },
      isTimeAware,
    };
  }

  static createDefaultStyleProperties(mapColors: string[]) {
    return getDefaultStaticProperties(mapColors);
  }

  constructor(
    descriptor: VectorStyleDescriptor | null,
    source: IVectorSource,
    layer: IVectorLayer,
    customIcons: CustomIcon[],
    chartsPaletteServiceGetColor?: (value: string) => string | null
  ) {
    this._source = source;
    this._layer = layer;
    this._customIcons = customIcons;
    this._descriptor = descriptor
      ? {
          ...descriptor,
          ...VectorStyle.createDescriptor(descriptor.properties, descriptor.isTimeAware),
        }
      : VectorStyle.createDescriptor();

    this._styleMeta = new StyleMeta(this._descriptor.__styleMeta);

    this._symbolizeAsStyleProperty = new SymbolizeAsProperty(
      this._descriptor.properties[VECTOR_STYLES.SYMBOLIZE_AS].options,
      VECTOR_STYLES.SYMBOLIZE_AS
    );
    this._lineColorStyleProperty = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.LINE_COLOR],
      VECTOR_STYLES.LINE_COLOR,
      chartsPaletteServiceGetColor
    );
    this._fillColorStyleProperty = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.FILL_COLOR],
      VECTOR_STYLES.FILL_COLOR,
      chartsPaletteServiceGetColor
    );
    this._lineWidthStyleProperty = this._makeSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.LINE_WIDTH],
      VECTOR_STYLES.LINE_WIDTH,
      this._symbolizeAsStyleProperty.isSymbolizedAsIcon()
    );
    this._iconStyleProperty = this._makeIconProperty(
      this._descriptor.properties[VECTOR_STYLES.ICON]
    );
    this._iconSizeStyleProperty = this._makeSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.ICON_SIZE],
      VECTOR_STYLES.ICON_SIZE,
      this._symbolizeAsStyleProperty.isSymbolizedAsIcon()
    );
    this._iconOrientationProperty = this._makeOrientationProperty(
      this._descriptor.properties[VECTOR_STYLES.ICON_ORIENTATION],
      VECTOR_STYLES.ICON_ORIENTATION
    );
    this._labelStyleProperty = this._makeLabelProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_TEXT]
    );
    this._labelSizeStyleProperty = this._makeSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_SIZE],
      VECTOR_STYLES.LABEL_SIZE,
      this._symbolizeAsStyleProperty.isSymbolizedAsIcon()
    );
    this._labelColorStyleProperty = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_COLOR],
      VECTOR_STYLES.LABEL_COLOR,
      chartsPaletteServiceGetColor
    );
    this._labelBorderColorStyleProperty = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_BORDER_COLOR],
      VECTOR_STYLES.LABEL_BORDER_COLOR,
      chartsPaletteServiceGetColor
    );
    this._labelBorderSizeStyleProperty = new LabelBorderSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_BORDER_SIZE].options,
      VECTOR_STYLES.LABEL_BORDER_SIZE,
      this._labelSizeStyleProperty
    );
  }

  async _updateFieldsInDescriptor(
    nextFields: IField[],
    styleFieldsHelper: StyleFieldsHelper,
    previousFields: IField[],
    mapColors: string[]
  ) {
    const originalProperties = this.getRawProperties();
    const invalidStyleNames: VECTOR_STYLES[] = (
      Object.keys(originalProperties) as VECTOR_STYLES[]
    ).filter((key) => {
      const dynamicOptions = getDynamicOptions(originalProperties, key);
      if (!dynamicOptions || !dynamicOptions.field || !dynamicOptions.field.name) {
        return false;
      }

      const hasMatchingField = nextFields.some((field) => {
        return (
          dynamicOptions && dynamicOptions.field && dynamicOptions.field.name === field.getName()
        );
      });
      return !hasMatchingField;
    });

    let hasChanges = false;

    const updatedProperties: VectorStylePropertiesDescriptor = { ...originalProperties };
    invalidStyleNames.forEach((invalidStyleName) => {
      for (let i = 0; i < previousFields.length; i++) {
        const previousField = previousFields[i];
        const nextField = nextFields[i];
        if (previousField.isEqual(nextField)) {
          continue;
        }
        const isFieldDataTypeCompatible = styleFieldsHelper.hasFieldForStyle(
          nextField,
          invalidStyleName
        );
        if (!isFieldDataTypeCompatible) {
          return;
        }
        hasChanges = true;
        (updatedProperties[invalidStyleName] as DynamicStyleProperties) = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            ...originalProperties[invalidStyleName].options,
            field: rectifyFieldDescriptor(nextField as IESAggField, {
              origin: previousField.getOrigin(),
              name: previousField.getName(),
            }),
          } as DynamicStylePropertyOptions,
        };
      }
    });

    return this._deleteFieldsFromDescriptorAndUpdateStyling(
      nextFields,
      updatedProperties,
      hasChanges,
      styleFieldsHelper,
      mapColors
    );
  }

  async _deleteFieldsFromDescriptorAndUpdateStyling(
    nextFields: IField[],
    originalProperties: VectorStylePropertiesDescriptor,
    hasChanges: boolean,
    styleFieldsHelper: StyleFieldsHelper,
    mapColors: string[]
  ) {
    // const originalProperties = this.getRawProperties();
    const updatedProperties = {} as VectorStylePropertiesDescriptor;

    const dynamicProperties = (Object.keys(originalProperties) as VECTOR_STYLES[]).filter((key) => {
      const dynamicOptions = getDynamicOptions(originalProperties, key);
      return dynamicOptions && dynamicOptions.field && dynamicOptions.field.name;
    });

    dynamicProperties.forEach((key: VECTOR_STYLES) => {
      // Convert dynamic styling to static stying when there are no style fields
      const styleFields = styleFieldsHelper.getFieldsForStyle(key);
      if (styleFields.length === 0) {
        const staticProperties = getDefaultStaticProperties(mapColors);
        updatedProperties[key] = staticProperties[key] as any;
        return;
      }

      const dynamicProperty = originalProperties[key];
      if (!dynamicProperty || !dynamicProperty.options) {
        return;
      }
      const fieldName = (dynamicProperty.options as DynamicStylePropertyOptions).field!.name;
      if (!fieldName) {
        return;
      }

      const matchingOrdinalField = nextFields.find((ordinalField) => {
        return fieldName === ordinalField.getName();
      });

      if (matchingOrdinalField) {
        return;
      }

      updatedProperties[key] = {
        type: DynamicStyleProperty.type,
        options: {
          ...originalProperties[key]!.options,
        },
      } as any;

      if ('field' in updatedProperties[key].options) {
        delete (updatedProperties[key].options as DynamicStylePropertyOptions).field;
      }
    });

    if (Object.keys(updatedProperties).length !== 0) {
      return {
        hasChanges: true,
        nextStyleDescriptor: VectorStyle.createDescriptor(
          {
            ...originalProperties,
            ...updatedProperties,
          },
          this.isTimeAware()
        ),
      };
    } else {
      return {
        hasChanges,
        nextStyleDescriptor: VectorStyle.createDescriptor(
          {
            ...originalProperties,
          },
          this.isTimeAware()
        ),
      };
    }
  }

  /*
   * Changes to source descriptor and join descriptor will impact style properties.
   * For instance, a style property may be dynamically tied to the value of an ordinal field defined
   * by a join or a metric aggregation. The metric aggregation or join may be edited or removed.
   * When this happens, the style will be linked to a no-longer-existing ordinal field.
   * This method provides a way for a style to clean itself and return a descriptor that unsets any dynamic
   * properties that are tied to missing oridinal fields
   *
   * This method does not update its descriptor. It just returns a new descriptor that the caller
   * can then use to update store state via dispatch.
   */
  async getDescriptorWithUpdatedStyleProps(
    nextFields: IField[],
    previousFields: IField[],
    mapColors: string[]
  ) {
    const styleFieldsHelper = await createStyleFieldsHelper(nextFields);

    return previousFields.length === nextFields.length
      ? // Field-config changed
        await this._updateFieldsInDescriptor(
          nextFields,
          styleFieldsHelper,
          previousFields,
          mapColors
        )
      : // Deletions or additions
        await this._deleteFieldsFromDescriptorAndUpdateStyling(
          nextFields,
          this.getRawProperties(),
          false,
          styleFieldsHelper,
          mapColors
        );
  }

  getType() {
    return LAYER_STYLE_TYPE.VECTOR;
  }

  getAllStyleProperties(): Array<IStyleProperty<StylePropertyOptions>> {
    return [
      this._symbolizeAsStyleProperty,
      this._iconStyleProperty,
      this._lineColorStyleProperty,
      this._fillColorStyleProperty,
      this._lineWidthStyleProperty,
      this._iconSizeStyleProperty,
      this._iconOrientationProperty,
      this._labelStyleProperty,
      this._labelSizeStyleProperty,
      this._labelColorStyleProperty,
      this._labelBorderColorStyleProperty,
      this._labelBorderSizeStyleProperty,
    ];
  }

  _hasBorder() {
    return this._lineWidthStyleProperty.isDynamic()
      ? this._lineWidthStyleProperty.isComplete()
      : (this._lineWidthStyleProperty as StaticSizeProperty).getOptions().size !== 0;
  }

  renderEditor(
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void,
    onCustomIconsChange: (customIcons: CustomIcon[]) => void
  ) {
    const rawProperties = this.getRawProperties();
    const handlePropertyChange = (propertyName: VECTOR_STYLES, stylePropertyDescriptor: any) => {
      rawProperties[propertyName] = stylePropertyDescriptor; // override single property, but preserve the rest
      const vectorStyleDescriptor = VectorStyle.createDescriptor(rawProperties, this.isTimeAware());
      onStyleDescriptorChange(vectorStyleDescriptor);
    };

    const onIsTimeAwareChange = (isTimeAware: boolean) => {
      const vectorStyleDescriptor = VectorStyle.createDescriptor(rawProperties, isTimeAware);
      onStyleDescriptorChange(vectorStyleDescriptor);
    };

    const propertiesWithFieldMeta = this.getDynamicPropertiesArray().filter((dynamicStyleProp) => {
      return dynamicStyleProp.isFieldMetaEnabled();
    });

    const styleProperties: StyleProperties = {};
    this.getAllStyleProperties().forEach((styleProperty) => {
      styleProperties[styleProperty.getStyleName()] = styleProperty;
    });

    return (
      <VectorStyleEditor
        handlePropertyChange={handlePropertyChange}
        styleProperties={styleProperties}
        layer={this._layer}
        isPointsOnly={this.getIsPointsOnly()}
        isLinesOnly={this._getIsLinesOnly()}
        onIsTimeAwareChange={onIsTimeAwareChange}
        onCustomIconsChange={onCustomIconsChange}
        isTimeAware={this.isTimeAware()}
        showIsTimeAware={propertiesWithFieldMeta.length > 0}
        customIcons={this._customIcons}
        hasBorder={this._hasBorder()}
      />
    );
  }

  async pluckStyleMetaFromTileMeta(metaFeatures: TileMetaFeature[]): Promise<StyleMetaDescriptor> {
    const supportedShapeTypes = await this._source.getSupportedShapeTypes();
    const styleMeta: StyleMetaDescriptor = {
      geometryTypes: {
        isPointsOnly:
          supportedShapeTypes.length === 1 && supportedShapeTypes.includes(VECTOR_SHAPE_TYPE.POINT),
        isLinesOnly:
          supportedShapeTypes.length === 1 && supportedShapeTypes.includes(VECTOR_SHAPE_TYPE.LINE),
        isPolygonsOnly:
          supportedShapeTypes.length === 1 &&
          supportedShapeTypes.includes(VECTOR_SHAPE_TYPE.POLYGON),
      },
      fieldMeta: {},
    };

    const dynamicProperties = this.getDynamicPropertiesArray();
    if (dynamicProperties.length === 0 || !metaFeatures) {
      // no additional meta data to pull from source data request.
      return styleMeta;
    }

    dynamicProperties.forEach((dynamicProperty) => {
      const name = dynamicProperty.getFieldName();
      if (!styleMeta.fieldMeta[name]) {
        styleMeta.fieldMeta[name] = { categories: [] };
      }
      const categories =
        dynamicProperty.pluckCategoricalStyleMetaFromTileMetaFeatures(metaFeatures);
      if (categories.length) {
        styleMeta.fieldMeta[name].categories = categories;
      }
      const ordinalStyleMeta =
        dynamicProperty.pluckOrdinalStyleMetaFromTileMetaFeatures(metaFeatures);
      if (ordinalStyleMeta) {
        styleMeta.fieldMeta[name].range = ordinalStyleMeta;
      }
    });

    return styleMeta;
  }

  async pluckStyleMetaFromSourceDataRequest(
    sourceDataRequest: DataRequest
  ): Promise<StyleMetaDescriptor> {
    const features = _.get(sourceDataRequest.getData(), 'features', []);
    const supportedFeatures = await this._source.getSupportedShapeTypes();
    const hasFeatureType = {
      [VECTOR_SHAPE_TYPE.POINT]: false,
      [VECTOR_SHAPE_TYPE.LINE]: false,
      [VECTOR_SHAPE_TYPE.POLYGON]: false,
    };
    if (supportedFeatures.length > 1) {
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];

        // ignore centroid features as they are added for styling and not part of the real data set
        if (feature.properties[KBN_IS_CENTROID_FEATURE]) {
          continue;
        }

        if (!hasFeatureType[VECTOR_SHAPE_TYPE.POINT] && POINTS.includes(feature.geometry.type)) {
          hasFeatureType[VECTOR_SHAPE_TYPE.POINT] = true;
        }
        if (!hasFeatureType[VECTOR_SHAPE_TYPE.LINE] && LINES.includes(feature.geometry.type)) {
          hasFeatureType[VECTOR_SHAPE_TYPE.LINE] = true;
        }
        if (
          !hasFeatureType[VECTOR_SHAPE_TYPE.POLYGON] &&
          POLYGONS.includes(feature.geometry.type)
        ) {
          hasFeatureType[VECTOR_SHAPE_TYPE.POLYGON] = true;
        }
      }
    }

    const styleMeta = {
      geometryTypes: {
        isPointsOnly: isOnlySingleFeatureType(
          VECTOR_SHAPE_TYPE.POINT,
          supportedFeatures,
          hasFeatureType
        ),
        isLinesOnly: isOnlySingleFeatureType(
          VECTOR_SHAPE_TYPE.LINE,
          supportedFeatures,
          hasFeatureType
        ),
        isPolygonsOnly: isOnlySingleFeatureType(
          VECTOR_SHAPE_TYPE.POLYGON,
          supportedFeatures,
          hasFeatureType
        ),
      },
      fieldMeta: {},
    } as StyleMetaDescriptor;

    const dynamicProperties = this.getDynamicPropertiesArray();
    if (dynamicProperties.length === 0 || features.length === 0) {
      // no additional meta data to pull from source data request.
      return styleMeta;
    }

    dynamicProperties.forEach(
      (dynamicProperty: IDynamicStyleProperty<DynamicStylePropertyOptions>) => {
        const name = dynamicProperty.getFieldName();
        if (!styleMeta.fieldMeta[name]) {
          styleMeta.fieldMeta[name] = { categories: [] };
        }
        const categories = dynamicProperty.pluckCategoricalStyleMetaFromFeatures(features);
        if (categories.length) {
          styleMeta.fieldMeta[name].categories = categories;
        }
        const ordinalStyleMeta = dynamicProperty.pluckOrdinalStyleMetaFromFeatures(features);
        if (ordinalStyleMeta) {
          styleMeta.fieldMeta[name].range = ordinalStyleMeta;
        }
      }
    );

    return styleMeta;
  }

  getSourceFieldNames() {
    const fieldNames: string[] = [];
    this.getDynamicPropertiesArray().forEach((styleProperty) => {
      if (styleProperty.getFieldOrigin() === FIELD_ORIGIN.SOURCE) {
        fieldNames.push(styleProperty.getFieldName());
      }
    });
    return fieldNames;
  }

  isTimeAware() {
    return this._descriptor.isTimeAware;
  }

  getRawProperties(): VectorStylePropertiesDescriptor {
    return this._descriptor.properties || {};
  }

  getDynamicPropertiesArray(): Array<IDynamicStyleProperty<DynamicStylePropertyOptions>> {
    const styleProperties = this.getAllStyleProperties();
    return styleProperties.filter(
      (styleProperty) => styleProperty.isDynamic() && styleProperty.isComplete()
    ) as Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
  }

  getIsPointsOnly = () => {
    return this._styleMeta.isPointsOnly();
  };

  _getIsLinesOnly = () => {
    return this._styleMeta.isLinesOnly();
  };

  _getIsPolygonsOnly = () => {
    return this._styleMeta.isPolygonsOnly();
  };

  _getDynamicPropertyByFieldName(fieldName: string) {
    const dynamicProps = this.getDynamicPropertiesArray();
    return dynamicProps.find((dynamicProp) => {
      return fieldName === dynamicProp.getFieldName();
    });
  }

  getStyleMeta() {
    return this._styleMeta;
  }

  _getFieldFormatter = (fieldName: string) => {
    const dynamicProp = this._getDynamicPropertyByFieldName(fieldName);
    if (!dynamicProp) {
      return null;
    }

    let dataRequestId;
    if (dynamicProp.getFieldOrigin() === FIELD_ORIGIN.SOURCE) {
      dataRequestId = SOURCE_FORMATTERS_DATA_REQUEST_ID;
    } else {
      const targetJoin = this._layer.getValidJoins().find((join) => {
        return !!join.getRightJoinSource().getFieldByName(fieldName);
      });
      if (targetJoin) {
        dataRequestId = targetJoin.getSourceFormattersDataRequestId();
      }
    }

    if (!dataRequestId) {
      return null;
    }

    const formattersDataRequest = this._layer.getDataRequest(dataRequestId);
    if (!formattersDataRequest || !formattersDataRequest.hasData()) {
      return null;
    }

    const formatters = formattersDataRequest.getData();
    // @ts-expect-error
    return formatters ? formatters[fieldName] : null;
  };

  getIconSvg(symbolId: string) {
    const meta = this._getIconMeta(symbolId);
    return meta ? meta.svg : undefined
  }

  _getSymbolId() {
    return this.arePointsSymbolizedAsCircles() || this._iconStyleProperty.isDynamic()
      ? undefined
      : (this._iconStyleProperty as StaticIconProperty).getOptions().value;
  }

  _getIconMeta(
    symbolId: string
  ): { svg: string; label: string; iconSource: ICON_SOURCE } | undefined {
    const icon = this._customIcons.find(({ symbolId: value }) => value === symbolId);
    if (icon) {
      return { ...icon, iconSource: ICON_SOURCE.CUSTOM };
    }
    const symbol = getMakiSymbol(symbolId);
    return symbol ? { ...symbol, iconSource: ICON_SOURCE.MAKI } : undefined;
  }

  getPrimaryColor() {
    const primaryColorKey = this._getIsLinesOnly()
      ? VECTOR_STYLES.LINE_COLOR
      : VECTOR_STYLES.FILL_COLOR;
    return extractColorFromStyleProperty(this._descriptor.properties[primaryColorKey], 'grey');
  }

  getIcon(showIncompleteIndicator: boolean) {
    const isLinesOnly = this._getIsLinesOnly();
    const isPointsOnly = this.getIsPointsOnly();

    let strokeColor;
    if (isLinesOnly) {
      strokeColor = extractColorFromStyleProperty(
        this._descriptor.properties[VECTOR_STYLES.LINE_COLOR],
        'grey'
      );
    } else if (this._hasBorder()) {
      strokeColor = extractColorFromStyleProperty(
        this._descriptor.properties[VECTOR_STYLES.LINE_COLOR],
        'none'
      );
    }
    const fillColor = isLinesOnly
      ? undefined
      : extractColorFromStyleProperty(
          this._descriptor.properties[VECTOR_STYLES.FILL_COLOR],
          'grey'
        );

    const borderStyle: CSSProperties = showIncompleteIndicator
      ? {
          borderColor: this.getPrimaryColor(),
          borderStyle: 'dashed',
          borderWidth: '1px',
        }
      : {};

    const symbolId = this._getSymbolId();
    const svg = symbolId ? this.getIconSvg(symbolId) : undefined;

    return (
      <VectorIcon
        borderStyle={borderStyle}
        isPointsOnly={isPointsOnly}
        isLinesOnly={isLinesOnly}
        strokeColor={strokeColor}
        fillColor={fillColor}
        symbolId={symbolId}
        svg={svg}
      />
    );
  }

  isUsingCustomIcon(symbolId: string) {
    if (this._iconStyleProperty.isDynamic()) {
      const { customIconStops } = this._iconStyleProperty.getOptions() as IconDynamicOptions;
      return customIconStops ? customIconStops.some(({ icon }) => icon === symbolId) : false;
    }
    const { value } = this._iconStyleProperty.getOptions() as IconStaticOptions;
    return value === symbolId;
  }

  _getLegendDetailStyleProperties = () => {
    const hasLabel = getHasLabel(this._labelStyleProperty);
    return this.getDynamicPropertiesArray().filter((styleProperty) => {
      const styleName = styleProperty.getStyleName();
      if ([VECTOR_STYLES.ICON_ORIENTATION, VECTOR_STYLES.LABEL_TEXT].includes(styleName)) {
        return false;
      }

      if (!hasLabel && LABEL_STYLES.includes(styleName)) {
        // do not render legend for label styles when there is no label
        return false;
      }

      if (this._getIsLinesOnly()) {
        return LINE_STYLES.includes(styleName);
      }

      if (this._getIsPolygonsOnly()) {
        return POLYGON_STYLES.includes(styleName);
      }

      return true;
    });
  };

  async hasLegendDetails() {
    return this._getLegendDetailStyleProperties().length > 0;
  }

  renderLegendDetails() {
    const symbolId = this._getSymbolId();
    const svg = symbolId ? this.getIconSvg(symbolId) : undefined;

    return (
      <VectorStyleLegend
        styles={this._getLegendDetailStyleProperties()}
        isPointsOnly={this.getIsPointsOnly()}
        isLinesOnly={this._getIsLinesOnly()}
        symbolId={symbolId}
        svg={svg}
      />
    );
  }

  clearFeatureState(featureCollection: FeatureCollection, mbMap: MbMap, sourceId: string) {
    const tmpFeatureIdentifier: FeatureIdentifier = {
      source: '',
      id: undefined,
    };
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      tmpFeatureIdentifier.source = sourceId;
      tmpFeatureIdentifier.id = feature.id;
      mbMap.removeFeatureState(tmpFeatureIdentifier);
    }
  }

  setFeatureStateAndStyleProps(
    featureCollection: FeatureCollection,
    mbMap: MbMap,
    mbSourceId: string
  ): boolean {
    if (!featureCollection) {
      return false;
    }

    const dynamicStyleProps = this.getDynamicPropertiesArray();
    if (dynamicStyleProps.length === 0) {
      return false;
    }

    let shouldResetAllData = false;
    for (let j = 0; j < dynamicStyleProps.length; j++) {
      const dynamicStyleProp = dynamicStyleProps[j];
      const usedFeatureState = dynamicStyleProp.enrichGeoJsonAndMbFeatureState(
        featureCollection,
        mbMap,
        mbSourceId
      );
      if (!usedFeatureState) {
        shouldResetAllData = true;
      }
    }

    // returns boolean indicating if styles do not support feature-state and some values are stored in geojson properties
    // this return-value is used in an optimization for style-updates with mapbox-gl.
    // `true` indicates the entire data needs to reset on the source (otherwise the style-rules will not be reapplied)
    // `false` indicates the data does not need to be reset on the store, because styles are re-evaluated if they use featureState
    return shouldResetAllData;
  }

  arePointsSymbolizedAsCircles() {
    return !this._symbolizeAsStyleProperty.isSymbolizedAsIcon();
  }

  setMBPaintProperties({
    alpha,
    mbMap,
    fillLayerId,
    lineLayerId,
  }: {
    alpha: number;
    mbMap: MbMap;
    fillLayerId: string;
    lineLayerId: string;
  }) {
    this._fillColorStyleProperty.syncFillColorWithMb(fillLayerId, mbMap, alpha);
    this._lineColorStyleProperty.syncLineColorWithMb(lineLayerId, mbMap, alpha);
    this._lineWidthStyleProperty.syncLineWidthWithMb(lineLayerId, mbMap);
  }

  setMBPaintPropertiesForPoints({
    alpha,
    mbMap,
    pointLayerId,
  }: {
    alpha: number;
    mbMap: MbMap;
    pointLayerId: string;
  }) {
    this._fillColorStyleProperty.syncCircleColorWithMb(pointLayerId, mbMap, alpha);
    this._lineColorStyleProperty.syncCircleStrokeWithMb(pointLayerId, mbMap, alpha);
    const hasNoRadius =
      !this._iconSizeStyleProperty.isDynamic() &&
      (this._iconSizeStyleProperty as StaticSizeProperty).getOptions().size === 0;
    this._lineWidthStyleProperty.syncCircleStrokeWidthWithMb(pointLayerId, mbMap, hasNoRadius);
    this._iconSizeStyleProperty.syncCircleRadiusWithMb(pointLayerId, mbMap);
  }

  setMBPropertiesForLabelText({
    alpha,
    mbMap,
    textLayerId,
  }: {
    alpha: number;
    mbMap: MbMap;
    textLayerId: string;
  }) {
    this._labelStyleProperty.syncTextFieldWithMb(textLayerId, mbMap);
    this._labelColorStyleProperty.syncLabelColorWithMb(textLayerId, mbMap, alpha);
    this._labelSizeStyleProperty.syncLabelSizeWithMb(textLayerId, mbMap);
    this._labelBorderSizeStyleProperty.syncLabelBorderSizeWithMb(textLayerId, mbMap);
    this._labelBorderColorStyleProperty.syncLabelBorderColorWithMb(textLayerId, mbMap);
  }

  setMBSymbolPropertiesForPoints({
    mbMap,
    symbolLayerId,
    alpha,
  }: {
    alpha: number;
    mbMap: MbMap;
    symbolLayerId: string;
  }) {
    mbMap.setLayoutProperty(symbolLayerId, 'icon-ignore-placement', true);
    mbMap.setPaintProperty(symbolLayerId, 'icon-opacity', alpha);
    mbMap.setLayoutProperty(symbolLayerId, 'icon-allow-overlap', true);

    this._iconStyleProperty.syncIconWithMb(symbolLayerId, mbMap);
    // icon-color is only supported on SDF icons.
    this._fillColorStyleProperty.syncIconColorWithMb(symbolLayerId, mbMap);
    this._lineColorStyleProperty.syncHaloBorderColorWithMb(symbolLayerId, mbMap);
    this._lineWidthStyleProperty.syncHaloWidthWithMb(symbolLayerId, mbMap);
    this._iconSizeStyleProperty.syncIconSizeWithMb(symbolLayerId, mbMap);
    this._iconOrientationProperty.syncIconRotationWithMb(symbolLayerId, mbMap);
  }

  _makeField(fieldDescriptor?: StylePropertyField): IField | null {
    if (!fieldDescriptor || !fieldDescriptor.name) {
      return null;
    }

    // fieldDescriptor.label is ignored. This is essentially cruft duplicating label-info from the metric-selection
    // Ignore this custom label
    if (fieldDescriptor.origin === FIELD_ORIGIN.SOURCE) {
      return this._source.getFieldByName(fieldDescriptor.name);
    } else if (fieldDescriptor.origin === FIELD_ORIGIN.JOIN) {
      const targetJoin = this._layer.getValidJoins().find((join) => {
        return !!join.getRightJoinSource().getFieldByName(fieldDescriptor.name);
      });
      return targetJoin
        ? targetJoin.getRightJoinSource().getFieldByName(fieldDescriptor.name)
        : null;
    } else {
      throw new Error(`Unknown origin-type ${fieldDescriptor.origin}`);
    }
  }

  _makeSizeProperty(
    descriptor: SizeStylePropertyDescriptor | undefined,
    styleName: VECTOR_STYLES,
    isSymbolizedAsIcon: boolean
  ) {
    if (!descriptor || !descriptor.options) {
      return new StaticSizeProperty({ size: 0 }, styleName);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticSizeProperty(descriptor.options as SizeStaticOptions, styleName);
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const options = descriptor.options as SizeDynamicOptions;
      const field = this._makeField(options.field);
      return new DynamicSizeProperty(
        options,
        styleName,
        field,
        this._layer,
        this._getFieldFormatter,
        isSymbolizedAsIcon
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }

  _makeColorProperty(
    descriptor: ColorStylePropertyDescriptor | undefined,
    styleName: VECTOR_STYLES,
    chartsPaletteServiceGetColor?: (value: string) => string | null
  ) {
    if (!descriptor || !descriptor.options) {
      return new StaticColorProperty({ color: '' }, styleName);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticColorProperty(descriptor.options as ColorStaticOptions, styleName);
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const options = descriptor.options as ColorDynamicOptions;
      const field = this._makeField(options.field);
      return new DynamicColorProperty(
        options,
        styleName,
        field,
        this._layer,
        this._getFieldFormatter,
        chartsPaletteServiceGetColor
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }

  _makeOrientationProperty(
    descriptor: OrientationStylePropertyDescriptor | undefined,
    styleName: VECTOR_STYLES
  ) {
    if (!descriptor || !descriptor.options) {
      return new StaticOrientationProperty({ orientation: 0 }, styleName);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticOrientationProperty(
        descriptor.options as OrientationStaticOptions,
        styleName
      );
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const options = descriptor.options as OrientationDynamicOptions;
      const field = this._makeField(options.field);
      return new DynamicOrientationProperty(
        options,
        styleName,
        field,
        this._layer,
        this._getFieldFormatter
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }

  _makeLabelProperty(descriptor?: LabelStylePropertyDescriptor) {
    if (!descriptor || !descriptor.options) {
      return new StaticTextProperty({ value: '' }, VECTOR_STYLES.LABEL_TEXT);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticTextProperty(
        descriptor.options as LabelStaticOptions,
        VECTOR_STYLES.LABEL_TEXT
      );
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const options = descriptor.options as LabelDynamicOptions;
      const field = this._makeField(options.field);
      return new DynamicTextProperty(
        options,
        VECTOR_STYLES.LABEL_TEXT,
        field,
        this._layer,
        this._getFieldFormatter
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }

  _makeIconProperty(descriptor?: IconStylePropertyDescriptor) {
    if (!descriptor || !descriptor.options) {
      return new StaticIconProperty({ value: DEFAULT_ICON }, VECTOR_STYLES.ICON);
    } else if (descriptor.type === StaticStyleProperty.type) {
      const { value } = { ...descriptor.options } as IconStaticOptions;
      const meta = this._getIconMeta(value);
      let svg;
      let label;
      let iconSource;
      if (meta) {
        ({ svg, label, iconSource } = meta);
      }
      return new StaticIconProperty(
        { value, svg, label, iconSource } as IconStaticOptions,
        VECTOR_STYLES.ICON
      );
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const options = { ...descriptor.options } as IconDynamicOptions;
      if (options.customIconStops) {
        options.customIconStops.forEach((iconStop) => {
          const meta = this._getIconMeta(iconStop.icon);
          if (meta) {
            iconStop.iconSource = meta.iconSource;
          }
        });
      }
      const field = this._makeField(options.field);
      return new DynamicIconProperty(
        options,
        VECTOR_STYLES.ICON,
        field,
        this._layer,
        this._getFieldFormatter
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }
}

function getDynamicOptions(
  originalProperties: VectorStylePropertiesDescriptor,
  key: VECTOR_STYLES
): DynamicStylePropertyOptions | null {
  if (!originalProperties[key]) {
    return null;
  }
  const propertyDescriptor = originalProperties[key];
  if (
    !propertyDescriptor ||
    !('type' in propertyDescriptor) ||
    propertyDescriptor.type !== STYLE_TYPE.DYNAMIC ||
    !propertyDescriptor.options
  ) {
    return null;
  }
  return propertyDescriptor.options as DynamicStylePropertyOptions;
}

function rectifyFieldDescriptor(
  currentField: IESAggField,
  previousFieldDescriptor: StylePropertyField
): StylePropertyField {
  return {
    origin: previousFieldDescriptor.origin,
    name: currentField.getName(),
  };
}
