/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React from 'react';
import { Feature, FeatureCollection } from 'geojson';
import type { FeatureIdentifier, Map as MbMap } from '@kbn/mapbox-gl';
import { AbstractStyleProperty, IStyleProperty } from './style_property';
import { DEFAULT_SIGMA } from '../vector_style_defaults';
import {
  DEFAULT_PERCENTILES,
  FIELD_ORIGIN,
  MB_LOOKUP_FUNCTION,
  SOURCE_META_DATA_REQUEST_ID,
  DATA_MAPPING_FUNCTION,
  STYLE_TYPE,
  VECTOR_STYLES,
  RawValue,
  FieldFormatter,
} from '../../../../../common/constants';
import {
  CategoricalDataMappingPopover,
  OrdinalDataMappingPopover,
} from '../components/data_mapping';
import {
  Category,
  CategoryFieldMeta,
  FieldMetaOptions,
  PercentilesFieldMeta,
  RangeFieldMeta,
  StyleMetaData,
  TileMetaFeature,
} from '../../../../../common/descriptor_types';
import { IField } from '../../../fields/field';
import { IVectorLayer } from '../../../layers/vector_layer';
import { InnerJoin } from '../../../joins/inner_join';
import { IVectorStyle } from '../vector_style';
import { getComputedFieldName } from '../style_util';
import { pluckRangeFieldMeta } from '../../../../../common/pluck_range_field_meta';
import {
  pluckCategoryFieldMeta,
  trimCategories,
} from '../../../../../common/pluck_category_field_meta';

export interface IDynamicStyleProperty<T> extends IStyleProperty<T> {
  getFieldMetaOptions(): FieldMetaOptions;
  getField(): IField | null;
  getFieldName(): string;
  getFieldOrigin(): FIELD_ORIGIN | null;
  getRangeFieldMeta(): RangeFieldMeta | null;
  getCategoryFieldMeta(): CategoryFieldMeta | null;
  /*
   * Returns hash that signals style meta needs to be re-fetched when value changes
   */
  getStyleMetaHash(): string;
  isFieldMetaEnabled(): boolean;
  isOrdinal(): boolean;
  supportsFieldMeta(): boolean;
  getFieldMetaRequest(): Promise<unknown | null>;
  pluckOrdinalStyleMetaFromFeatures(features: Feature[]): RangeFieldMeta | null;
  pluckCategoricalStyleMetaFromFeatures(features: Feature[]): CategoryFieldMeta | null;
  pluckOrdinalStyleMetaFromTileMetaFeatures(features: TileMetaFeature[]): RangeFieldMeta | null;
  pluckCategoricalStyleMetaFromTileMetaFeatures(
    features: TileMetaFeature[]
  ): CategoryFieldMeta | null;
  getValueSuggestions(query: string): Promise<string[]>;
  enrichGeoJsonAndMbFeatureState(
    featureCollection: FeatureCollection,
    mbMap: MbMap,
    mbSourceId: string
  ): boolean;
}

export class DynamicStyleProperty<T>
  extends AbstractStyleProperty<T>
  implements IDynamicStyleProperty<T> {
  static type = STYLE_TYPE.DYNAMIC;

  protected readonly _field: IField | null;
  protected readonly _layer: IVectorLayer;
  protected readonly _getFieldFormatter: (fieldName: string) => null | FieldFormatter;

  constructor(
    options: T,
    styleName: VECTOR_STYLES,
    field: IField | null,
    vectorLayer: IVectorLayer,
    getFieldFormatter: (fieldName: string) => null | FieldFormatter
  ) {
    super(options, styleName);
    this._field = field;
    this._layer = vectorLayer;
    this._getFieldFormatter = getFieldFormatter;
  }

  getValueSuggestions = async (query: string) => {
    return this._field === null
      ? []
      : await this._field.getSource().getValueSuggestions(this._field, query);
  };

  _getStyleMetaDataRequestId(fieldName: string) {
    if (this.getFieldOrigin() === FIELD_ORIGIN.SOURCE) {
      return SOURCE_META_DATA_REQUEST_ID;
    }

    const join = this._layer.getValidJoins().find((validJoin: InnerJoin) => {
      return !!validJoin.getRightJoinSource().getFieldByName(fieldName);
    });
    return join ? join.getSourceMetaDataRequestId() : null;
  }

  _getRangeFieldMetaFromLocalFeatures() {
    const style = this._layer.getStyle() as IVectorStyle;
    const styleMeta = style.getStyleMeta();
    const fieldName = this.getFieldName();
    return styleMeta.getRangeFieldMetaDescriptor(fieldName);
  }

  _getRangeFieldMetaFromStyleMetaRequest(): RangeFieldMeta | null {
    const dataRequestId = this._getStyleMetaDataRequestId(this.getFieldName());
    if (!dataRequestId) {
      return null;
    }

    const styleMetaDataRequest = this._layer.getDataRequest(dataRequestId);
    if (!styleMetaDataRequest || !styleMetaDataRequest.hasData()) {
      return null;
    }

    const data = styleMetaDataRequest.getData() as StyleMetaData;
    const rangeFieldMeta = this._pluckOrdinalStyleMetaFromFieldMetaData(data);
    return rangeFieldMeta ? rangeFieldMeta : null;
  }

  getRangeFieldMeta(): RangeFieldMeta | null {
    const rangeFieldMetaFromLocalFeatures = this._getRangeFieldMetaFromLocalFeatures();
    if (!this.isFieldMetaEnabled()) {
      return rangeFieldMetaFromLocalFeatures;
    }

    const rangeFieldMetaFromServer = this._getRangeFieldMetaFromStyleMetaRequest();
    return rangeFieldMetaFromServer ? rangeFieldMetaFromServer : rangeFieldMetaFromLocalFeatures;
  }

  getPercentilesFieldMeta() {
    if (!this._field) {
      return null;
    }

    const dataRequestId = this._getStyleMetaDataRequestId(this.getFieldName());
    if (!dataRequestId) {
      return null;
    }

    const styleMetaDataRequest = this._layer.getDataRequest(dataRequestId);
    if (!styleMetaDataRequest || !styleMetaDataRequest.hasData()) {
      return null;
    }

    const styleMetaData = styleMetaDataRequest.getData() as StyleMetaData;
    const percentiles = styleMetaData[`${this._field.getRootName()}_percentiles`] as
      | undefined
      | PercentilesValues;
    return percentilesValuesToFieldMeta(percentiles);
  }

  _getCategoryFieldMetaFromLocalFeatures() {
    const style = this._layer.getStyle() as IVectorStyle;
    const styleMeta = style.getStyleMeta();
    const fieldName = this.getFieldName();
    return styleMeta.getCategoryFieldMetaDescriptor(fieldName);
  }

  _getCategoryFieldMetaFromStyleMetaRequest() {
    const dataRequestId = this._getStyleMetaDataRequestId(this.getFieldName());
    if (!dataRequestId) {
      return null;
    }

    const styleMetaDataRequest = this._layer.getDataRequest(dataRequestId);
    if (!styleMetaDataRequest || !styleMetaDataRequest.hasData()) {
      return null;
    }

    const data = styleMetaDataRequest.getData() as StyleMetaData;
    return this._pluckCategoricalStyleMetaFromFieldMetaData(data);
  }

  getCategoryFieldMeta(): CategoryFieldMeta | null {
    const categoryFieldMetaFromLocalFeatures = this._getCategoryFieldMetaFromLocalFeatures();

    if (!this.isFieldMetaEnabled()) {
      return categoryFieldMetaFromLocalFeatures;
    }

    const categoricalFieldMetaFromServer = this._getCategoryFieldMetaFromStyleMetaRequest();
    return categoricalFieldMetaFromServer
      ? categoricalFieldMetaFromServer
      : categoryFieldMetaFromLocalFeatures;
  }

  getField() {
    return this._field;
  }

  getFieldName() {
    return this._field ? this._field.getName() : '';
  }

  isDynamic() {
    return true;
  }

  isOrdinal() {
    return true;
  }

  isCategorical() {
    return false;
  }

  getNumberOfCategories() {
    return 0;
  }

  getStyleMetaHash(): string {
    const fieldMetaOptions = this.getFieldMetaOptions();
    const parts: string[] = [fieldMetaOptions.isEnabled.toString()];
    if (this.isOrdinal()) {
      const dataMappingFunction = this.getDataMappingFunction();
      parts.push(dataMappingFunction);
      if (
        dataMappingFunction === DATA_MAPPING_FUNCTION.PERCENTILES &&
        fieldMetaOptions.percentiles
      ) {
        parts.push(fieldMetaOptions.percentiles.join(''));
      }
    } else if (this.isCategorical()) {
      parts.push(this.getNumberOfCategories().toString());
    }
    return parts.join('');
  }

  isComplete() {
    return !!this._field;
  }

  getFieldOrigin() {
    return this._field ? this._field.getOrigin() : null;
  }

  isFieldMetaEnabled() {
    const fieldMetaOptions = this.getFieldMetaOptions();
    return this.supportsFieldMeta() && _.get(fieldMetaOptions, 'isEnabled', true);
  }

  supportsFieldMeta() {
    return this.isComplete() && !!this._field && this._field.supportsFieldMeta();
  }

  async getFieldMetaRequest() {
    if (!this._field) {
      return null;
    }

    if (this.isOrdinal()) {
      return this.getDataMappingFunction() === DATA_MAPPING_FUNCTION.INTERPOLATE
        ? this._field.getExtendedStatsFieldMetaRequest()
        : this._field.getPercentilesFieldMetaRequest(
            this.getFieldMetaOptions().percentiles !== undefined
              ? this.getFieldMetaOptions().percentiles
              : DEFAULT_PERCENTILES
          );
    }

    if (this.isCategorical()) {
      const numberOfCategories = this.getNumberOfCategories();
      return this._field.getCategoricalFieldMetaRequest(numberOfCategories);
    }

    return null;
  }

  supportsMbFeatureState() {
    return !!this._field && this._field.canReadFromGeoJson();
  }

  getMbLookupFunction(): MB_LOOKUP_FUNCTION {
    return this.supportsMbFeatureState()
      ? MB_LOOKUP_FUNCTION.FEATURE_STATE
      : MB_LOOKUP_FUNCTION.GET;
  }

  getFieldMetaOptions() {
    return _.get(this.getOptions(), 'fieldMetaOptions', { isEnabled: true });
  }

  getDataMappingFunction() {
    return 'dataMappingFunction' in this._options
      ? (this._options as T & { dataMappingFunction: DATA_MAPPING_FUNCTION }).dataMappingFunction
      : DATA_MAPPING_FUNCTION.INTERPOLATE;
  }

  pluckOrdinalStyleMetaFromTileMetaFeatures(
    metaFeatures: TileMetaFeature[]
  ): RangeFieldMeta | null {
    if (!this.isOrdinal()) {
      return null;
    }

    const name = this.getFieldName();
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < metaFeatures.length; i++) {
      const fieldMeta = metaFeatures[i].properties.fieldMeta;
      if (fieldMeta && fieldMeta[name] && fieldMeta[name].range) {
        min = Math.min(fieldMeta[name].range?.min as number, min);
        max = Math.max(fieldMeta[name].range?.max as number, max);
      }
    }
    return {
      min,
      max,
      delta: max - min,
    };
  }

  pluckCategoricalStyleMetaFromTileMetaFeatures(
    metaFeatures: TileMetaFeature[]
  ): CategoryFieldMeta | null {
    const size = this.getNumberOfCategories();
    if (!this.isCategorical() || size <= 0) {
      return null;
    }

    const name = this.getFieldName();

    const counts = new Map<string, number>();
    for (let i = 0; i < metaFeatures.length; i++) {
      const fieldMeta = metaFeatures[i].properties.fieldMeta;
      if (fieldMeta && fieldMeta[name] && fieldMeta[name].categories) {
        const categoryFieldMeta: CategoryFieldMeta = fieldMeta[name]
          .categories as CategoryFieldMeta;
        for (let c = 0; c < categoryFieldMeta.categories.length; c++) {
          const category: Category = categoryFieldMeta.categories[c];
          // properties object may be sparse, so need to check if the field is effectively present
          if (typeof category.key !== undefined) {
            if (counts.has(category.key)) {
              counts.set(category.key, (counts.get(category.key) as number) + category.count);
            } else {
              counts.set(category.key, category.count);
            }
          }
        }
      }
    }

    return trimCategories(counts, size);
  }

  pluckOrdinalStyleMetaFromFeatures(features: Feature[]): RangeFieldMeta | null {
    if (!this.isOrdinal()) {
      return null;
    }

    const name = this.getFieldName();
    return pluckRangeFieldMeta(features, name, (rawValue: unknown) => {
      return parseFloat(rawValue as string);
    });
  }

  pluckCategoricalStyleMetaFromFeatures(features: Feature[]): CategoryFieldMeta | null {
    const size = this.getNumberOfCategories();
    if (!this.isCategorical() || size <= 0) {
      return null;
    }

    return pluckCategoryFieldMeta(features, this.getFieldName(), size);
  }

  _pluckOrdinalStyleMetaFromFieldMetaData(styleMetaData: StyleMetaData): RangeFieldMeta | null {
    if (!this.isOrdinal() || !this._field) {
      return null;
    }

    const stats = styleMetaData[`${this._field.getRootName()}_range`];
    if (!stats || !('avg' in stats)) {
      return null;
    }

    const sigma = _.get(this.getFieldMetaOptions(), 'sigma', DEFAULT_SIGMA);
    const stdLowerBounds = stats.avg - stats.std_deviation * sigma;
    const stdUpperBounds = stats.avg + stats.std_deviation * sigma;
    const min = Math.max(stats.min, stdLowerBounds);
    const max = Math.min(stats.max, stdUpperBounds);
    return {
      min,
      max,
      delta: max - min,
      isMinOutsideStdRange: stats.min < stdLowerBounds,
      isMaxOutsideStdRange: stats.max > stdUpperBounds,
    };
  }

  _pluckCategoricalStyleMetaFromFieldMetaData(
    styleMetaData: StyleMetaData
  ): CategoryFieldMeta | null {
    if (!this.isCategorical() || !this._field) {
      return null;
    }

    const fieldMeta = styleMetaData[`${this._field.getRootName()}_terms`];
    if (!fieldMeta || !('buckets' in fieldMeta)) {
      return null;
    }

    return {
      categories: fieldMeta.buckets.map((bucket) => {
        return {
          key: bucket.key,
          count: bucket.doc_count,
        };
      }),
    };
  }

  formatField(value: RawValue): string | number {
    if (this.getField()) {
      const fieldName = this.getFieldName();
      const fieldFormatter = this._getFieldFormatter(fieldName);
      return fieldFormatter ? fieldFormatter(value) : super.formatField(value);
    } else {
      return super.formatField(value);
    }
  }

  _getSupportedDataMappingFunctions(): DATA_MAPPING_FUNCTION[] {
    return [DATA_MAPPING_FUNCTION.INTERPOLATE];
  }

  renderDataMappingPopover(onChange: (updatedOptions: Partial<T>) => void) {
    if (!this.supportsFieldMeta()) {
      return null;
    }
    return this.isCategorical() ? (
      <CategoricalDataMappingPopover<T>
        fieldMetaOptions={this.getFieldMetaOptions()}
        onChange={onChange}
      />
    ) : (
      <OrdinalDataMappingPopover<T>
        fieldMetaOptions={this.getFieldMetaOptions()}
        styleName={this.getStyleName()}
        onChange={onChange}
        dataMappingFunction={this.getDataMappingFunction()}
        supportedDataMappingFunctions={this._getSupportedDataMappingFunctions()}
      />
    );
  }

  // Returns the name that should be used for accessing the data from the mb-style rule
  // Depending on
  // - whether the field is used for labeling, icon-orientation, or other properties (color, size, ...), `feature-state` and or `get` is used
  // - whether the field was run through a field-formatter, a new dynamic field is created with the formatted-value
  // The combination of both will inform what field-name (e.g. the "raw" field name from the properties, the "computed field-name" for an on-the-fly created property (e.g. for feature-state or field-formatting).
  // todo: There is an existing limitation to .mvt backed sources, where the field-formatters are not applied. Here, the raw-data needs to be accessed.
  getMbPropertyName() {
    if (!this._field) {
      return '';
    }

    let targetName;
    if (this.supportsMbFeatureState()) {
      // Base case for any properties that can support feature-state (e.g. color, size, ...)
      // They just re-use the original property-name
      targetName = this._field.getName();
    } else {
      if (this._field.canReadFromGeoJson() && this._field.supportsAutoDomain()) {
        // Geojson-sources can support rewrite
        // e.g. field-formatters will create duplicate field
        targetName = getComputedFieldName(this.getStyleName(), this._field.getName());
      } else {
        // Non-geojson sources (e.g. 3rd party mvt or ES-source as mvt)
        targetName = this._field.getName();
      }
    }
    return targetName;
  }

  getMbPropertyValue(rawValue: RawValue): RawValue {
    // Maps only uses feature-state for numerical values.
    // `supportsMbFeatureState` will only return true when the mb-style rule does a feature-state lookup on a numerical value
    // Calling `isOrdinal` would be equivalent.
    return this.supportsMbFeatureState() ? getNumericalMbFeatureStateValue(rawValue) : rawValue;
  }

  enrichGeoJsonAndMbFeatureState(
    featureCollection: FeatureCollection,
    mbMap: MbMap,
    mbSourceId: string
  ): boolean {
    const supportsFeatureState = this.supportsMbFeatureState();
    const featureIdentifier: FeatureIdentifier = {
      source: mbSourceId,
      id: undefined,
    };
    const featureState: Record<string, RawValue> = {};
    const targetMbName = this.getMbPropertyName();
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      const rawValue = feature.properties ? feature.properties[this.getFieldName()] : undefined;
      const targetMbValue = this.getMbPropertyValue(rawValue);
      if (supportsFeatureState) {
        featureState[targetMbName] = targetMbValue; // the same value will be potentially overridden multiple times, if the name remains identical
        featureIdentifier.id = feature.id;
        mbMap.setFeatureState(featureIdentifier, featureState);
      } else {
        if (feature.properties) {
          feature.properties[targetMbName] = targetMbValue;
        }
      }
    }
    return supportsFeatureState;
  }
}

export function getNumericalMbFeatureStateValue(value: RawValue) {
  if (typeof value !== 'string') {
    return value;
  }

  const valueAsFloat = parseFloat(value);
  return isNaN(valueAsFloat) ? null : valueAsFloat;
}

interface PercentilesValues {
  values?: { [key: string]: number };
}
export function percentilesValuesToFieldMeta(
  percentiles?: PercentilesValues | undefined
): PercentilesFieldMeta | null {
  if (percentiles === undefined || percentiles.values === undefined) {
    return null;
  }
  const percentilesFieldMeta = Object.keys(percentiles.values).map((key) => {
    return {
      percentile: key,
      value: percentiles.values![key],
    };
  });
  return _.uniqBy(percentilesFieldMeta, 'value');
}
