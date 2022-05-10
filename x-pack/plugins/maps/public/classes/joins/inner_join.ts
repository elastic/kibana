/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@kbn/data-plugin/public';
import { Feature, GeoJsonProperties } from 'geojson';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { ESTermSource } from '../sources/es_term_source';
import { getComputedFieldNamePrefix } from '../styles/vector/style_util';
import {
  FORMATTERS_DATA_REQUEST_ID_SUFFIX,
  META_DATA_REQUEST_ID_SUFFIX,
  SOURCE_TYPES,
} from '../../../common/constants';
import {
  ESTermSourceDescriptor,
  JoinDescriptor,
  TableSourceDescriptor,
  TermJoinSourceDescriptor,
} from '../../../common/descriptor_types';
import { IVectorSource } from '../sources/vector_source';
import { IField } from '../fields/field';
import { PropertiesMap } from '../../../common/elasticsearch_util';
import { ITermJoinSource } from '../sources/term_join_source';
import { TableSource } from '../sources/table_source';

function createJoinTermSource(
  descriptor: Partial<TermJoinSourceDescriptor> | undefined,
  inspectorAdapters: Adapters | undefined
): ITermJoinSource | undefined {
  if (!descriptor) {
    return;
  }

  if (
    descriptor.type === SOURCE_TYPES.ES_TERM_SOURCE &&
    'indexPatternId' in descriptor &&
    'term' in descriptor
  ) {
    return new ESTermSource(descriptor as ESTermSourceDescriptor, inspectorAdapters);
  } else if (descriptor.type === SOURCE_TYPES.TABLE_SOURCE) {
    return new TableSource(descriptor as TableSourceDescriptor, inspectorAdapters);
  }
}

export class InnerJoin {
  private readonly _descriptor: JoinDescriptor;
  private readonly _rightSource?: ITermJoinSource;
  private readonly _leftField?: IField;

  constructor(joinDescriptor: JoinDescriptor, leftSource: IVectorSource) {
    this._descriptor = joinDescriptor;
    const inspectorAdapters = leftSource.getInspectorAdapters();
    this._rightSource = createJoinTermSource(this._descriptor.right, inspectorAdapters);
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

  getJoinFields(): IField[] {
    return this._rightSource ? this._rightSource.getRightFields() : [];
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
    if (!this._leftField) {
      throw new Error('Cannot get leftField from InnerJoin with incomplete config');
    }
    return this._leftField;
  }

  joinPropertiesToFeature(feature: Feature, propertiesMap: PropertiesMap): boolean {
    if (!feature.properties || !this._leftField || !this._rightSource) {
      return false;
    }
    const rightMetricFields: IField[] = this._rightSource.getRightFields();
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
          delete feature.properties![featurePropertyKey];
        }
      });
    }

    const joinKey = this.getJoinKey(feature);
    if (joinKey !== null && propertiesMap.has(joinKey)) {
      Object.assign(feature.properties, propertiesMap.get(joinKey));
      return true;
    } else {
      return false;
    }
  }

  getJoinKey(feature: Feature): string | null {
    const joinKey =
      feature.properties && this._leftField
        ? feature.properties[this._leftField.getName()]
        : undefined;
    return joinKey === undefined || joinKey === null ? null : joinKey.toString();
  }

  getRightJoinSource(): ITermJoinSource {
    if (!this._rightSource) {
      throw new Error('Cannot get rightSource from InnerJoin with incomplete config');
    }
    return this._rightSource;
  }

  toDescriptor(): JoinDescriptor {
    return this._descriptor;
  }

  async getTooltipProperties(properties: GeoJsonProperties) {
    return await this.getRightJoinSource().getTooltipProperties(properties);
  }

  getIndexPatternIds() {
    return this.getRightJoinSource().getIndexPatternIds();
  }

  getQueryableIndexPatternIds() {
    return this.getRightJoinSource().getQueryableIndexPatternIds();
  }

  getWhereQuery(): Query | undefined {
    return this.getRightJoinSource().getWhereQuery();
  }
}
