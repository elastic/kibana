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

  getJoinFields() {
    return this._rightSource.getMetricFields().map(({ property_key: name, property_label: label }) => {
      return { label, name };
    });
  }

  getSourceId() {
    return LeftInnerJoin.toHash(this._descriptor);
  }

  getLeftFieldName() {
    return this._descriptor.leftField;
  }

  joinPropertiesToFeatureCollection(featureCollection, propertiesMap) {
    featureCollection.features.forEach(feature => {
      const joinKey = feature.properties[this._descriptor.leftField];
      if (propertiesMap.has(joinKey)) {
        feature.properties = {
          ...feature.properties,
          ...propertiesMap.get(joinKey),
        };
      }
    });
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

