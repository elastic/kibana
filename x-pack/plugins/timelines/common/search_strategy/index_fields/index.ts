/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/search-types';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { FieldSpec } from '@kbn/data-plugin/common';

import type { Maybe } from '../common';

export type BeatFieldsFactoryQueryType = 'beatFields';

export interface FieldInfo {
  category: string;
  description?: string;
  example?: string | number;
  format?: string;
  name: string;
  type?: string;
}

export interface IndexField extends Omit<FieldSpec, 'format'> {
  /** Where the field belong */
  category: string;
  /** Example of field's value */
  example?: Maybe<string | number>;
  /** whether the field's belong to an alias index */
  indexes: Array<Maybe<string>>;
  /** Description of the field */
  description?: Maybe<string>;
  format?: Maybe<string>;
}

/**
 * @deprecated use EcsFlat from @kbn/ecs or kibana data views api
 */
export type BeatFields = Record<string, FieldInfo>;

export interface IndexFieldsStrategyRequestByIndices extends IEsSearchRequest {
  indices: string[];
  onlyCheckIfIndicesExist: boolean;
  includeUnmapped?: boolean;
}
export interface IndexFieldsStrategyRequestById extends IEsSearchRequest {
  dataViewId: string;
  onlyCheckIfIndicesExist: boolean;
}

/**
 * @deprecated use kibana data views api https://github.com/elastic/kibana/blob/83f1fb4f26219f32cab43706db78d544c7bc2f6d/src/plugins/data_views/common/data_views/data_views.ts#L294
 */
export type IndexFieldsStrategyRequest<T extends 'indices' | 'dataView'> = T extends 'dataView'
  ? IndexFieldsStrategyRequestById
  : IndexFieldsStrategyRequestByIndices;

/**
 * @deprecated use kibana data views api https://github.com/elastic/kibana/blob/83f1fb4f26219f32cab43706db78d544c7bc2f6d/src/plugins/data_views/common/data_views/data_views.ts#L294
 */
export interface IndexFieldsStrategyResponse extends IEsSearchResponse {
  indexFields: IndexField[];
  indicesExist: string[];
  runtimeMappings: MappingRuntimeFields;
}

/**
 * @deprecated use fields list on dataview / "indexPattern"
 * about to use browserFields? Reconsider! Maybe you can accomplish
 * everything you need via the `fields` property on the data view
 * you are working with? Or perhaps you need a description for a
 * particular field? Consider using the EcsFlat module from `@kbn/ecs`
 * NOTE: This "Omit" type is necesssary as some places expect the format field to be a string,
 * this will be aligned with the spec near term.
 */
export type BrowserField = Omit<FieldSpec, 'format'> & { format?: string };

type FieldCategoryName = string;

export interface FieldCategory {
  fields: Record<string, Partial<BrowserField>>;
}

export interface FieldCategory {
  fields: Record<string, Partial<BrowserField>>;
}

/**
 * @deprecated use fields list on dataview / "indexPattern"
 * about to use browserFields? Reconsider! Maybe you can accomplish
 * everything you need via the `fields` property on the data view
 * you are working with? Or perhaps you need a description for a
 * particular field? Consider using the EcsFlat module from `@kbn/ecs`
 */
export type BrowserFields = Record<FieldCategoryName, FieldCategory>;

export const EMPTY_BROWSER_FIELDS = {};
export const EMPTY_INDEX_FIELDS: FieldSpec[] = [];
