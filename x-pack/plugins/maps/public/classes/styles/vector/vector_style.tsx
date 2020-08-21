/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { Map as MbMap, FeatureIdentifier } from 'mapbox-gl';
import { FeatureCollection } from 'geojson';
// @ts-expect-error
import { VectorStyleEditor } from './components/vector_style_editor';
import {
  getDefaultProperties,
  getDefaultStaticProperties,
  LINE_STYLES,
  POLYGON_STYLES,
} from './vector_style_defaults';
import {
  GEO_JSON_TYPE,
  FIELD_ORIGIN,
  STYLE_TYPE,
  SOURCE_FORMATTERS_DATA_REQUEST_ID,
  LAYER_STYLE_TYPE,
  DEFAULT_ICON,
  VECTOR_SHAPE_TYPE,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { StyleMeta } from './style_meta';
import { VectorIcon } from './components/legend/vector_icon';
import { VectorStyleLegend } from './components/legend/vector_style_legend';
import { getComputedFieldName, isOnlySingleFeatureType } from './style_util';
import { StaticStyleProperty } from './properties/static_style_property';
import { DynamicStyleProperty } from './properties/dynamic_style_property';
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
  VectorStyleDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../../common/descriptor_types';
import { DataRequest } from '../../util/data_request';
import { IStyle } from '../style';
import { IStyleProperty } from './properties/style_property';
import { IDynamicStyleProperty } from './properties/dynamic_style_property';
import { IField } from '../../fields/field';
import { IVectorLayer } from '../../layers/vector_layer/vector_layer';
import { IVectorSource } from '../../sources/vector_source';
import { ILayer } from '../../layers/layer';

const POINTS = [GEO_JSON_TYPE.POINT, GEO_JSON_TYPE.MULTI_POINT];
const LINES = [GEO_JSON_TYPE.LINE_STRING, GEO_JSON_TYPE.MULTI_LINE_STRING];
const POLYGONS = [GEO_JSON_TYPE.POLYGON, GEO_JSON_TYPE.MULTI_POLYGON];

function getNumericalMbFeatureStateValue(value: string) {
  const valueAsFloat = parseFloat(value);
  return isNaN(valueAsFloat) ? null : valueAsFloat;
}

export interface IVectorStyle extends IStyle {
  getAllStyleProperties(): Array<IStyleProperty<StylePropertyOptions>>;
  getDynamicPropertiesArray(): Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
  getSourceFieldNames(): string[];
  getStyleMeta(): StyleMeta;
  getDescriptorWithMissingStylePropsRemoved(
    nextFields: IField[],
    mapColors: string[]
  ): { hasChanges: boolean; nextStyleDescriptor?: VectorStyleDescriptor };
  pluckStyleMetaFromSourceDataRequest(sourceDataRequest: DataRequest): Promise<StyleMetaDescriptor>;
}

export class VectorStyle implements IVectorStyle {
  private readonly _descriptor: VectorStyleDescriptor;
  private readonly _layer: IVectorLayer;
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

  static createDescriptor(properties = {}, isTimeAware = true) {
    return {
      type: LAYER_STYLE_TYPE.VECTOR,
      properties: { ...getDefaultProperties(), ...properties },
      isTimeAware,
    };
  }

  static createDefaultStyleProperties(mapColors: string[]) {
    return getDefaultProperties(mapColors);
  }

  constructor(
    descriptor: VectorStyleDescriptor | null,
    source: IVectorSource,
    layer: IVectorLayer
  ) {
    this._source = source;
    this._layer = layer;
    this._descriptor = descriptor
      ? {
          ...descriptor,
          ...VectorStyle.createDescriptor(descriptor.properties, descriptor.isTimeAware),
        }
      : VectorStyle.createDescriptor();

    this._styleMeta = new StyleMeta(this._descriptor.__styleMeta);

    this._symbolizeAsStyleProperty = new SymbolizeAsProperty(
      this._descriptor.properties[VECTOR_STYLES.SYMBOLIZE_AS]!.options,
      VECTOR_STYLES.SYMBOLIZE_AS
    );
    this._lineColorStyleProperty = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.LINE_COLOR],
      VECTOR_STYLES.LINE_COLOR
    );
    this._fillColorStyleProperty = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.FILL_COLOR],
      VECTOR_STYLES.FILL_COLOR
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
      VECTOR_STYLES.LABEL_COLOR
    );
    this._labelBorderColorStyleProperty = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_BORDER_COLOR],
      VECTOR_STYLES.LABEL_BORDER_COLOR
    );
    this._labelBorderSizeStyleProperty = new LabelBorderSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_BORDER_SIZE]!.options,
      VECTOR_STYLES.LABEL_BORDER_SIZE,
      this._labelSizeStyleProperty
    );
  }

  getType() {
    return LAYER_STYLE_TYPE.VECTOR;
  }

  getAllStyleProperties() {
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

  renderEditor({
    layer,
    onStyleDescriptorChange,
  }: {
    layer: ILayer;
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void;
  }) {
    const rawProperties = this.getRawProperties();
    const handlePropertyChange = (propertyName: VECTOR_STYLES, settings: any) => {
      rawProperties[propertyName] = settings; // override single property, but preserve the rest
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

    const styleProperties: VectorStylePropertiesDescriptor = {};
    this.getAllStyleProperties().forEach((styleProperty) => {
      // @ts-expect-error
      styleProperties[styleProperty.getStyleName()] = styleProperty;
    });

    return (
      <VectorStyleEditor
        handlePropertyChange={handlePropertyChange}
        styleProperties={styleProperties}
        layer={layer}
        isPointsOnly={this._getIsPointsOnly()}
        isLinesOnly={this._getIsLinesOnly()}
        onIsTimeAwareChange={onIsTimeAwareChange}
        isTimeAware={this.isTimeAware()}
        showIsTimeAware={propertiesWithFieldMeta.length > 0}
        hasBorder={this._hasBorder()}
      />
    );
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
  getDescriptorWithMissingStylePropsRemoved(nextFields: IField[], mapColors: string[]) {
    const originalProperties = this.getRawProperties();
    const updatedProperties = {} as VectorStylePropertiesDescriptor;

    const dynamicProperties = (Object.keys(originalProperties) as VECTOR_STYLES[]).filter((key) => {
      if (!originalProperties[key]) {
        return false;
      }
      const propertyDescriptor = originalProperties[key];
      if (
        !propertyDescriptor ||
        !('type' in propertyDescriptor) ||
        propertyDescriptor.type !== STYLE_TYPE.DYNAMIC ||
        !propertyDescriptor.options
      ) {
        return false;
      }
      const dynamicOptions = propertyDescriptor.options as DynamicStylePropertyOptions;
      return dynamicOptions.field && dynamicOptions.field.name;
    });

    dynamicProperties.forEach((key: VECTOR_STYLES) => {
      // Convert dynamic styling to static stying when there are no nextFields
      if (nextFields.length === 0) {
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
      // @ts-expect-error
      delete updatedProperties[key].options.field;
    });

    if (Object.keys(updatedProperties).length === 0) {
      return {
        hasChanges: false,
        nextStyleDescriptor: { ...this._descriptor },
      };
    }

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
  }

  async pluckStyleMetaFromSourceDataRequest(sourceDataRequest: DataRequest) {
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

    dynamicProperties.forEach((dynamicProperty) => {
      const categoricalStyleMeta = dynamicProperty.pluckCategoricalStyleMetaFromFeatures(features);
      const ordinalStyleMeta = dynamicProperty.pluckOrdinalStyleMetaFromFeatures(features);
      const name = dynamicProperty.getFieldName();
      if (!styleMeta.fieldMeta[name]) {
        styleMeta.fieldMeta[name] = {};
      }
      if (categoricalStyleMeta) {
        styleMeta.fieldMeta[name].categories = categoricalStyleMeta;
      }

      if (ordinalStyleMeta) {
        styleMeta.fieldMeta[name].range = ordinalStyleMeta;
      }
    });

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

  getRawProperties() {
    return this._descriptor.properties || {};
  }

  getDynamicPropertiesArray() {
    const styleProperties = this.getAllStyleProperties();
    return styleProperties.filter(
      (styleProperty) => styleProperty.isDynamic() && styleProperty.isComplete()
    ) as Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
  }

  _getIsPointsOnly = () => {
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
        return join.getRightJoinSource().hasMatchingMetricField(fieldName);
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

  _getSymbolId() {
    return this.arePointsSymbolizedAsCircles() || this._iconStyleProperty.isDynamic()
      ? undefined
      : (this._iconStyleProperty as StaticIconProperty).getOptions().value;
  }

  getIcon = () => {
    const isLinesOnly = this._getIsLinesOnly();
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

    return (
      <VectorIcon
        isPointsOnly={this._getIsPointsOnly()}
        isLinesOnly={isLinesOnly}
        symbolId={this._getSymbolId()}
        strokeColor={strokeColor}
        fillColor={fillColor}
      />
    );
  };

  _getLegendDetailStyleProperties = () => {
    return this.getDynamicPropertiesArray().filter((styleProperty) => {
      const styleName = styleProperty.getStyleName();
      if ([VECTOR_STYLES.ICON_ORIENTATION, VECTOR_STYLES.LABEL_TEXT].includes(styleName)) {
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
    return (
      <VectorStyleLegend
        styles={this._getLegendDetailStyleProperties()}
        isPointsOnly={this._getIsPointsOnly()}
        isLinesOnly={this._getIsLinesOnly()}
        symbolId={this._getSymbolId()}
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
  ) {
    if (!featureCollection) {
      return;
    }

    const dynamicStyleProps = this.getDynamicPropertiesArray();
    if (dynamicStyleProps.length === 0) {
      return;
    }

    const tmpFeatureIdentifier: FeatureIdentifier = {
      source: '',
      id: undefined,
    };
    const tmpFeatureState: any = {};

    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];

      for (let j = 0; j < dynamicStyleProps.length; j++) {
        const dynamicStyleProp = dynamicStyleProps[j];
        const name = dynamicStyleProp.getFieldName();
        const computedName = getComputedFieldName(dynamicStyleProp.getStyleName(), name);
        const rawValue = feature.properties ? feature.properties[name] : undefined;
        if (dynamicStyleProp.supportsMbFeatureState()) {
          tmpFeatureState[name] = getNumericalMbFeatureStateValue(rawValue); // the same value will be potentially overridden multiple times, if the name remains identical
        } else {
          // in practice, a new system property will only be created for:
          // - label text: this requires the value to be formatted first.
          // - icon orientation: this is a lay-out property which do not support feature-state (but we're still coercing to a number)

          const formattedValue = dynamicStyleProp.isOrdinal()
            ? getNumericalMbFeatureStateValue(rawValue)
            : dynamicStyleProp.formatField(rawValue);

          if (feature.properties) feature.properties[computedName] = formattedValue;
        }
      }
      tmpFeatureIdentifier.source = mbSourceId;
      tmpFeatureIdentifier.id = feature.id;
      mbMap.setFeatureState(tmpFeatureIdentifier, tmpFeatureState);
    }

    // returns boolean indicating if styles do not support feature-state and some values are stored in geojson properties
    // this return-value is used in an optimization for style-updates with mapbox-gl.
    // `true` indicates the entire data needs to reset on the source (otherwise the style-rules will not be reapplied)
    // `false` indicates the data does not need to be reset on the store, because styles are re-evaluated if they use featureState
    return dynamicStyleProps.some((dynamicStyleProp) => !dynamicStyleProp.supportsMbFeatureState());
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
    mbMap.setLayoutProperty(textLayerId, 'icon-allow-overlap', true);
    mbMap.setLayoutProperty(textLayerId, 'text-allow-overlap', true);
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

    this._iconStyleProperty.syncIconWithMb(
      symbolLayerId,
      mbMap,
      this._iconSizeStyleProperty.getIconPixelSize()
    );
    // icon-color is only supported on SDF icons.
    this._fillColorStyleProperty.syncIconColorWithMb(symbolLayerId, mbMap);
    this._lineColorStyleProperty.syncHaloBorderColorWithMb(symbolLayerId, mbMap);
    this._lineWidthStyleProperty.syncHaloWidthWithMb(symbolLayerId, mbMap);
    this._iconSizeStyleProperty.syncIconSizeWithMb(symbolLayerId, mbMap);
    this._iconOrientationProperty.syncIconRotationWithMb(symbolLayerId, mbMap);
  }

  _makeField(fieldDescriptor?: StylePropertyField) {
    if (!fieldDescriptor || !fieldDescriptor.name) {
      return null;
    }

    // fieldDescriptor.label is ignored. This is essentially cruft duplicating label-info from the metric-selection
    // Ignore this custom label
    if (fieldDescriptor.origin === FIELD_ORIGIN.SOURCE) {
      return this._source.getFieldByName(fieldDescriptor.name);
    } else if (fieldDescriptor.origin === FIELD_ORIGIN.JOIN) {
      const targetJoin = this._layer.getValidJoins().find((join) => {
        return join.getRightJoinSource().hasMatchingMetricField(fieldDescriptor.name);
      });
      return targetJoin
        ? targetJoin.getRightJoinSource().getMetricFieldForName(fieldDescriptor.name)
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
    styleName: VECTOR_STYLES
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
        this._getFieldFormatter
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
      return new StaticIconProperty(descriptor.options as IconStaticOptions, VECTOR_STYLES.ICON);
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const options = descriptor.options as IconDynamicOptions;
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
