/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentType } from 'react';
import SemVer from 'semver/classes/semver';

import { MainType, SubType, DataType, NormalizedField, NormalizedFields } from '../../../../types';

import { AliasType } from './alias_type';
import { KeywordType } from './keyword_type';
import { NumericType } from './numeric_type';
import { TextType } from './text_type';
import { BooleanType } from './boolean_type';
import { BinaryType } from './binary_type';
import { RangeType } from './range_type';
import { IpType } from './ip_type';
import { TokenCountType } from './token_count_type';
import { CompletionType } from './completion_type';
import { GeoPointType } from './geo_point_type';
import { DateType } from './date_type';
import { GeoShapeType } from './geo_shape_type';
import { SearchAsYouType } from './search_as_you_type';
import { FlattenedType } from './flattened_type';
import { ShapeType } from './shape_type';
import { DenseVectorType } from './dense_vector_type';
import { ObjectType } from './object_type';
import { OtherType } from './other_type';
import { NestedType } from './nested_type';
import { JoinType } from './join_type';
import { HistogramType } from './histogram_type';
import { ConstantKeywordType } from './constant_keyword_type';
import { RankFeatureType } from './rank_feature_type';
import { WildcardType } from './wildcard_type';
import { PointType } from './point_type';
import { VersionType } from './version_type';

const typeToParametersFormMap: { [key in DataType]?: ComponentType<any> } = {
  alias: AliasType,
  keyword: KeywordType,
  numeric: NumericType,
  text: TextType,
  boolean: BooleanType,
  binary: BinaryType,
  range: RangeType,
  ip: IpType,
  token_count: TokenCountType,
  completion: CompletionType,
  geo_point: GeoPointType,
  date: DateType,
  date_nanos: DateType,
  geo_shape: GeoShapeType,
  search_as_you_type: SearchAsYouType,
  flattened: FlattenedType,
  shape: ShapeType,
  dense_vector: DenseVectorType,
  object: ObjectType,
  other: OtherType,
  nested: NestedType,
  join: JoinType,
  histogram: HistogramType,
  constant_keyword: ConstantKeywordType,
  rank_feature: RankFeatureType,
  wildcard: WildcardType,
  point: PointType,
  version: VersionType,
};

export const getParametersFormForType = (
  type: MainType,
  subType?: SubType
):
  | ComponentType<{
      field: NormalizedField;
      allFields: NormalizedFields['byId'];
      isMultiField: boolean;
      kibanaVersion: SemVer;
    }>
  | undefined =>
  subType === undefined
    ? typeToParametersFormMap[type]
    : typeToParametersFormMap[subType] || typeToParametersFormMap[type];
