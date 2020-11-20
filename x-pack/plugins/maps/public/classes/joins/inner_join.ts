/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query } from 'src/plugins/data/public';
import { Feature, GeoJsonProperties } from 'geojson';
import { ESTermSource } from '../sources/es_term_source';
import { getComputedFieldNamePrefix } from '../styles/vector/style_util';
import {
  META_DATA_REQUEST_ID_SUFFIX,
  FORMATTERS_DATA_REQUEST_ID_SUFFIX,
} from '../../../common/constants';
import { JoinDescriptor } from '../../../common/descriptor_types';
import { IVectorSource } from '../sources/vector_source';
import { IField } from '../fields/field';
import { IJoin } from './join';
import { PropertiesMap } from '../../../common/elasticsearch_util';

export class InnerJoin implements IJoin {
  private readonly _descriptor: JoinDescriptor;
  private readonly _rightSource?: ESTermSource;
  private readonly _leftField?: IField;

  constructor(joinDescriptor: JoinDescriptor, leftSource: IVectorSource) {
    this._descriptor = joinDescriptor;
    const inspectorAdapters = leftSource.getInspectorAdapters();
    if (
      joinDescriptor.right &&
      'indexPatternId' in joinDescriptor.right &&
      'term' in joinDescriptor.right
    ) {
      this._rightSource = new ESTermSource(joinDescriptor.right, inspectorAdapters);
    }
    this._leftField = joinDescriptor.leftField
      ? leftSource.createField({ fieldName: joinDescriptor.leftField })
      : undefined;
  }

  destroy() {
    if (this._rightSource) {
      this._rightSource.destroy();
    }
  }

  hasCompleteConfig() {
    return this._leftField && this._rightSource ? this._rightSource.hasCompleteConfig() : false;
  }

  getJoinFields() {
    return this._rightSource ? this._rightSource.getMetricFields() : [];
  }

  // Source request id must be static and unique because the re-fetch logic uses the id to locate the previous request.
  // Elasticsearch sources have a static and unique id so that requests can be modified in the inspector.
  // Using the right source id as the source request id because it meets the above criteria.
  getSourceDataRequestId() {
    return `join_source_${this._rightSource!.getId()}`;
  }

  getSourceMetaDataRequestId() {
    return `${this.getSourceDataRequestId()}_${META_DATA_REQUEST_ID_SUFFIX}`;
  }

  getSourceFormattersDataRequestId() {
    return `${this.getSourceDataRequestId()}_${FORMATTERS_DATA_REQUEST_ID_SUFFIX}`;
  }

  getLeftField(): IField {
    return this._leftField!;
  }

  joinPropertiesToFeature(feature: Feature, propertiesMap: PropertiesMap): boolean {
    if (!feature.properties) {
      return false;
    }
    const rightMetricFields = this._rightSource!.getMetricFields();
    // delete feature properties added by previous join
    for (let j = 0; j < rightMetricFields.length; j++) {
      const metricPropertyKey = rightMetricFields[j].getName();
      delete feature.properties[metricPropertyKey];

      // delete all dynamic properties for metric field
      const stylePropertyPrefix = getComputedFieldNamePrefix(metricPropertyKey);
      Object.keys(feature.properties).forEach((featurePropertyKey) => {
        if (
          featurePropertyKey.length >= stylePropertyPrefix.length &&
          featurePropertyKey.substring(0, stylePropertyPrefix.length) === stylePropertyPrefix
        ) {
          // For some reason, ts compilation complains about this deletion
          if (feature.properties) {
            delete feature.properties[featurePropertyKey];
          }
        }
      });
    }

    const joinKey = this._leftField ? feature.properties[this._leftField.getName()] : undefined;
    const coercedKey =
      typeof joinKey === 'undefined' || joinKey === null ? null : joinKey.toString();
    if (propertiesMap && coercedKey !== null && propertiesMap.has(coercedKey)) {
      Object.assign(feature.properties, propertiesMap.get(coercedKey));
      return true;
    } else {
      return false;
    }
  }

  getRightJoinSource() {
    return this._rightSource!;
  }

  toDescriptor(): JoinDescriptor {
    return this._descriptor;
  }

  async getTooltipProperties(properties: GeoJsonProperties) {
    return await this._rightSource!.getTooltipProperties(properties);
  }

  getIndexPatternIds() {
    return this._rightSource!.getIndexPatternIds();
  }

  getQueryableIndexPatternIds() {
    return this._rightSource!.getQueryableIndexPatternIds();
  }

  getWhereQuery(): Query | undefined {
    return this._rightSource!.getWhereQuery();
  }
}
