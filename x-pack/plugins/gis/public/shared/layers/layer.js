/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EMSFileSource } from './sources/ems_file_source';
import { EMSTMSSource } from './sources/ems_tms_source';
import { XYZTMSSource } from './sources/xyz_tms_source';
import { ESGeohashGridSource } from './sources/es_geohashgrid_source';

export const LAYER_TYPE = {
  TILE: 'TILE',
  VECTOR: 'VECTOR',
  GEOHASH_GRID: 'GEOHASH_GRID'
};

export class ALayer {

  constructor(layerDescriptor) {
    this._descriptor = layerDescriptor;
  }

  static createDescriptor(options) {
    const layerDescriptor = {};
    layerDescriptor.source = options.source;
    layerDescriptor.sourceDescriptor = options.sourceDescriptor;
    layerDescriptor.visible = options.visible || true;
    layerDescriptor.temporary = options.temporary || false;
    layerDescriptor.style = options.style || {};
    layerDescriptor.id = Math.random().toString(36).substr(2, 5);
    layerDescriptor.name = this._setName(options, layerDescriptor.id);
    return layerDescriptor;
  }

  static _setName({ nameList, name }, id) {
    const layerName = name || `Layer ${id}`;
    const duplicateCount = (nameList ? nameList : []).filter((listName) => listName === layerName
        || listName.match(new RegExp(`${layerName} \\d`)))
      .length;
    return duplicateCount ? `${layerName} ${duplicateCount}` : layerName;
  }

  getDisplayName() {
    return this._descriptor.name;
  }

  getId() {
    return this._descriptor.id;
  }

  getType() {
    return this._descriptor.type;
  }

  isVisible() {
    return this._descriptor.visible;
  }

  isTemporary() {
    return this._descriptor.temporary;
  }

  getSupportedStyles() {
    return [];
  }

  getCurrentStyle() {
    throw new Error('Style not implemented');
  }

  renderSourceDetails() {
    //todo: this is just a placeholder. actual resolution can happen in selector
    let source;
    if (this._descriptor.sourceDescriptor.type === XYZTMSSource.type) {
      source = new XYZTMSSource(this._descriptor.sourceDescriptor);
    } else if (this._descriptor.sourceDescriptor.type === EMSTMSSource.type) {
      source = new EMSTMSSource(this._descriptor.sourceDescriptor);
    } else if (this._descriptor.sourceDescriptor.type === EMSFileSource.type) {
      source = new EMSFileSource(this._descriptor.sourceDescriptor);
    } else if (this._descriptor.sourceDescriptor.type === ESGeohashGridSource.type) {
      source = new ESGeohashGridSource(this._descriptor.sourceDescriptor);
    } else {
      console.error('Cannot marshall', this._descriptor.sourceDescriptor);
      throw new Error(`Source with type ${this._descriptor.sourceDescriptor.type} not recognized`);
    }
    return source.renderDetails();
  }


}

