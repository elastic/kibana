/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const LAYER_TYPE = {
  TILE: 'TILE',
  VECTOR: 'VECTOR'
};

export class ALayer {

  constructor(layerDescriptor) {
    this._descriptor = layerDescriptor;
  }

  static createDescriptor(options) {
    const layerDescriptor = {};
    layerDescriptor.source = options.source;
    layerDescriptor.visible = options.visible || true;
    layerDescriptor.temporary = options.temporary || false;
    layerDescriptor.style = options.style || {};
    layerDescriptor.id = Math.random().toString(36).substr(2, 5);
    layerDescriptor.name = this._setName(options, layerDescriptor.id);
    return layerDescriptor;
  }

  static _setName({ nameList, name }, id) {
    const layerName = name || `Layer ${id}`;
    const duplicateCount = (nameList ? nameList : [])
      .filter((listName) => listName === layerName
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
}

