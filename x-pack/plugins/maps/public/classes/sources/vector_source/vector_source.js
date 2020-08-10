/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TooltipProperty } from '../../tooltips/tooltip_property';
import { AbstractSource } from './../source';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';

export class AbstractVectorSource extends AbstractSource {
  /**
   * factory function creating a new field-instance
   * @param fieldName
   * @param label
   * @returns {IField}
   */
  createField() {
    throw new Error(`Should implemement ${this.constructor.type} ${this}`);
  }

  getFieldNames() {
    return [];
  }

  /**
   * Retrieves a field. This may be an existing instance.
   * @param fieldName
   * @param label
   * @returns {IField}
   */
  getFieldByName(name) {
    return this.createField({ fieldName: name });
  }

  _getTooltipPropertyNames() {
    return this._tooltipFields.map((field) => field.getName());
  }

  isFilterByMapBounds() {
    return false;
  }

  isBoundsAware() {
    return false;
  }

  async getBoundsForFilters() {
    console.warn('Should implement AbstractVectorSource#getBoundsForFilters');
    return null;
  }

  async getFields() {
    return [];
  }

  async getLeftJoinFields() {
    return [];
  }

  async getGeoJsonWithMeta() {
    throw new Error('Should implement VectorSource#getGeoJson');
  }

  canFormatFeatureProperties() {
    return false;
  }

  // Allow source to filter and format feature properties before displaying to user
  async filterAndFormatPropertiesToHtml(properties) {
    const tooltipProperties = [];
    for (const key in properties) {
      if (key.startsWith('__kbn')) {
        //these are system properties and should be ignored
        continue;
      }
      tooltipProperties.push(new TooltipProperty(key, key, properties[key]));
    }
    return tooltipProperties;
  }

  async isTimeAware() {
    return false;
  }

  showJoinEditor() {
    return true;
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPE.POINT, VECTOR_SHAPE_TYPE.LINE, VECTOR_SHAPE_TYPE.POLYGON];
  }

  getSourceTooltipContent(/* sourceDataRequest */) {
    return { tooltipContent: null, areResultsTrimmed: false };
  }

  getSyncMeta() {
    return {};
  }
}
