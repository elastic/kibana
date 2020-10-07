/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, GeoJsonProperties } from 'geojson';
import { IESTermSource } from '../sources/es_term_source';
import { JoinDescriptor } from '../../../common/descriptor_types';
import { ITooltipProperty } from '../tooltips/tooltip_property';
import { IField } from '../fields/field';
import { BucketProperties } from '../../../common/elasticsearch_util';

export type PropertiesMap = Map<string, BucketProperties>;

export interface IJoin {
  destroy: () => void;

  getRightJoinSource: () => IESTermSource;

  toDescriptor: () => JoinDescriptor;

  getJoinFields: () => IField[];

  getLeftField: () => IField;

  getIndexPatternIds: () => string[];

  getQueryableIndexPatternIds: () => string[];

  getSourceDataRequestId: () => string;

  getSourceMetaDataRequestId: () => string;

  getSourceFormattersDataRequestId: () => string;

  getTooltipProperties: (properties: GeoJsonProperties) => Promise<ITooltipProperty[]>;

  hasCompleteConfig: () => boolean;

  joinPropertiesToFeature: (feature: Feature, propertiesMap?: PropertiesMap) => boolean;
}
