/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesIndexState,
  MappingProperty,
  PropertyName,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface NewestIndex extends IndicesIndexState {
  name: string;
  info: DataStreamInfo;
  flattenedMappings: Record<PropertyName, MappingProperty>;
}

export interface DataStreamInfo {
  isManaged?: boolean;
  isManagedByFleet?: boolean;
  integration?: string | null;
  template?: string;
  type?: string;
  dataset?: string;
  namespace?: string;
}

export type EsqlDocument = Record<string, string | null>;

export interface EsqlHit {
  _id: string;
  _index: string;
  _source: EsqlDocument;
}
