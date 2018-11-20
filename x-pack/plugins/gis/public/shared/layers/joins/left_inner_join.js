/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ESTableSource } from '../sources/es_table_source';

export class LeftInnerJoin {

  static toHash(descriptor) {
    return JSON.stringify(descriptor);
  }

  constructor(joinDescriptor) {
    this._descriptor = joinDescriptor;
    this._rightSource = new ESTableSource(joinDescriptor.right);
  }

  hasCompleteConfig() {
    if (this._descriptor.leftField && this._rightSource) {
      return this._rightSource.hasCompleteConfig();
    }

    return false;
  }

  getSourceId() {
    return LeftInnerJoin.toHash(this._descriptor);
  }

  getHumanReadableName() {
    return `count of ${this._descriptor.right.indexPatternTitle} by ${this._descriptor.right.term}`;
  }

  getLeftFieldName() {
    return this._descriptor.leftField;
  }

  // Name of key added to the geoJson properties that contains the results of the join
  getJoinFieldName() {
    return `__kbn__join(${this.getSourceId()})`;
  }

  joinTableToFeatureCollection(featureCollection, table) {
    const newField = this.getJoinFieldName();
    //todo: poor man's join with nested loop
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      feature.properties[newField] = null;//wipe
      const joinfield = feature.properties[this._descriptor.leftField];
      for (let j = 0; j < table.length; j++) {
        if (table[j].key === joinfield) {
          feature.properties[newField] = table[j].value;
        }
      }
    }
  }

  getTableSource() {
    return this._rightSource;
  }

  getId() {
    return this._descriptor.id;
  }

  toDescriptor() {
    return this._descriptor;
  }

}

