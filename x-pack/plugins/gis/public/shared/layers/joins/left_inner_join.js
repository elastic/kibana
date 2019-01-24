/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ESJoinSource } from '../sources/es_join_source';
import { VectorStyle } from '../styles/vector_style';

export class LeftInnerJoin {

  static toHash(descriptor) {
    return JSON.stringify(descriptor);
  }

  constructor(joinDescriptor) {
    this._descriptor = joinDescriptor;
    this._rightSource = new ESJoinSource(joinDescriptor.right);
  }

  destroy() {
    this._rightSource.destroy();
  }

  hasCompleteConfig() {
    if (this._descriptor.leftField && this._rightSource) {
      return this._rightSource.hasCompleteConfig();
    }

    return false;
  }

  getJoinFields() {
    return this._rightSource.getMetricFields().map(({ propertyKey: name, propertyLabel: label }) => {
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
    const joinFields = this.getJoinFields();
    featureCollection.features.forEach(feature => {
      // Clean up old join property values
      joinFields.forEach(({ name }) => {
        delete feature.properties[name];
        const stylePropertyName = VectorStyle.getComputedFieldName(name);
        delete feature.properties[stylePropertyName];
      });

      const joinKey = feature.properties[this._descriptor.leftField];
      if (propertiesMap.has(joinKey)) {
        feature.properties = {
          ...feature.properties,
          ...propertiesMap.get(joinKey),
        };
      }
    });
  }

  getJoinSource() {
    return this._rightSource;
  }

  getId() {
    return this._descriptor.id;
  }

  toDescriptor() {
    return this._descriptor;
  }

  filterAndFormatPropertiesForTooltip(properties) {
    const joinFields = this.getJoinFields();
    const tooltipProps = {};
    joinFields.forEach((joinField) => {
      for (const key in properties) {
        if (properties.hasOwnProperty(key)) {
          if (joinField.name === key) {
            tooltipProps[joinField.label] = properties[key];
          }
        }
      }
    });

    return tooltipProps;
  }

  getIndexPatternIds() {
    return  this._rightSource.getIndexPatternIds();
  }

}

