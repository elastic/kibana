/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';

import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { ModelConfig } from '@kbn/inference_integration_flyout';
import { GenericObject } from './mappings_editor';

import { PARAMETERS_DEFINITION } from '../constants';
import { FieldConfig, RuntimeField } from '../shared_imports';

export interface DataTypeDefinition {
  label: string;
  value: DataType;
  documentation?: {
    main: string;
    [key: string]: string;
  };
  subTypes?: { label: string; types: SubType[] };
  description?: () => ReactNode;
  isBeta?: boolean;
}

export interface ParameterDefinition {
  title?: string;
  description?: JSX.Element | string;
  fieldConfig: FieldConfig<any>;
  schema?: any;
  props?: { [key: string]: ParameterDefinition };
  documentation?: {
    main: string;
    [key: string]: string;
  };
  [key: string]: any;
}

export type MainType =
  | 'text'
  | 'match_only_text'
  | 'keyword'
  | 'numeric'
  | 'binary'
  | 'boolean'
  | 'range'
  | 'object'
  | 'nested'
  | 'alias'
  | 'completion'
  | 'dense_vector'
  | 'flattened'
  | 'ip'
  | 'join'
  | 'percolator'
  | 'rank_feature'
  | 'rank_features'
  | 'passthrough'
  | 'shape'
  | 'search_as_you_type'
  | 'sparse_vector'
  | 'semantic_text'
  | 'date'
  | 'date_nanos'
  | 'geo_point'
  | 'geo_shape'
  | 'token_count'
  | 'point'
  | 'histogram'
  | 'constant_keyword'
  | 'version'
  | 'wildcard'
  /**
   * 'other' is a special type that only exists inside of MappingsEditor as a placeholder
   * for undocumented field types.
   */
  | 'other';

export type SubType = NumericType | RangeType;

export type DataType = MainType | SubType;

export type NumericType =
  | 'long'
  | 'integer'
  | 'short'
  | 'byte'
  | 'double'
  | 'float'
  | 'half_float'
  | 'scaled_float'
  | 'unsigned_long';

export type RangeType =
  | 'integer_range'
  | 'float_range'
  | 'long_range'
  | 'ip_range'
  | 'double_range'
  | 'date_range';

export type ParameterName =
  | 'name'
  | 'type'
  | 'store'
  | 'index'
  | 'fielddata'
  | 'fielddata_frequency_filter'
  | 'fielddata_frequency_filter_percentage'
  | 'fielddata_frequency_filter_absolute'
  | 'doc_values'
  | 'doc_values_binary'
  | 'coerce'
  | 'coerce_shape'
  | 'ignore_malformed'
  | 'null_value'
  | 'null_value_numeric'
  | 'null_value_boolean'
  | 'null_value_geo_point'
  | 'null_value_ip'
  | 'null_value_point'
  | 'copy_to'
  | 'dynamic'
  | 'dynamic_toggle'
  | 'dynamic_strict'
  | 'enabled'
  | 'boost'
  | 'locale'
  | 'format'
  | 'analyzer'
  | 'search_analyzer'
  | 'search_quote_analyzer'
  | 'index_options'
  | 'index_options_flattened'
  | 'index_options_keyword'
  | 'eager_global_ordinals'
  | 'eager_global_ordinals_join'
  | 'index_prefixes'
  | 'index_phrases'
  | 'positive_score_impact'
  | 'norms'
  | 'norms_keyword'
  | 'term_vector'
  | 'position_increment_gap'
  | 'similarity'
  | 'normalizer'
  | 'ignore_above'
  | 'split_queries_on_whitespace'
  | 'scaling_factor'
  | 'max_input_length'
  | 'preserve_separators'
  | 'preserve_position_increments'
  | 'ignore_z_value'
  | 'enable_position_increments'
  | 'orientation'
  | 'points_only'
  | 'path'
  | 'dims'
  | 'priority'
  | 'inference_id'
  | 'reference_field'
  | 'depth_limit'
  | 'relations'
  | 'max_shingle_size'
  | 'value'
  | 'meta'
  | 'time_series_metric'
  | 'time_series_dimension'
  | 'subobjects';

export interface Parameter {
  fieldConfig: FieldConfig;
  paramName?: string;
  docs?: string;
  props?: { [key: string]: FieldConfig };
}

export interface Fields {
  [key: string]: Omit<Field, 'name'>;
}

interface FieldBasic {
  name: string;
  type: DataType;
  subType?: SubType;
  properties?: { [key: string]: Omit<Field, 'name'> };
  fields?: { [key: string]: Omit<Field, 'name'> };

  // other* exist together as a holder of types that the mappings editor does not yet know about but
  // enables the user to create mappings with them.
  otherTypeJson?: GenericObject;
}

type FieldParams = {
  [K in ParameterName]: (typeof PARAMETERS_DEFINITION)[K]['fieldConfig']['defaultValue'] | unknown;
};

export type Field = FieldBasic & Partial<FieldParams>;

export type SemanticTextField = Field & { inference_id: string; reference_field: string };

export interface FieldMeta {
  childFieldsName: ChildFieldName | undefined;
  canHaveChildFields: boolean;
  canHaveMultiFields: boolean;
  hasChildFields: boolean;
  hasMultiFields: boolean;
  childFields?: string[];
  isExpanded: boolean;
}

export interface NormalizedFields {
  byId: {
    [id: string]: NormalizedField;
  };
  rootLevelFields: string[];
  aliases: { [key: string]: string[] };
  maxNestedDepth: number;
}

export interface NormalizedField extends FieldMeta {
  id: string;
  parentId?: string;
  nestedDepth: number;
  path: string[];
  source: Omit<Field, 'properties' | 'fields'>;
  isMultiField: boolean;
}

export type ChildFieldName = 'properties' | 'fields';

export interface AliasOption {
  id: string;
  label: string;
}

export interface RuntimeFields {
  [name: string]: Omit<RuntimeField, 'name'>;
}

export interface NormalizedRuntimeField {
  id: string;
  source: RuntimeField;
}

export interface NormalizedRuntimeFields {
  [id: string]: NormalizedRuntimeField;
}
export enum DefaultInferenceModels {
  elser_model_2 = 'elser_model_2',
  e5 = 'e5',
}

export enum DeploymentState {
  'DEPLOYED' = 'deployed',
  'NOT_DEPLOYED' = 'not_deployed',
}
export interface CustomInferenceEndpointConfig {
  taskType: InferenceTaskType;
  modelConfig: ModelConfig;
}
