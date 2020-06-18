/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-duplicate-case */

import { Type } from '../../../common/schemas';

export type QueryFilterType = Array<
  | { term: { list_id: string } }
  | { terms: { binary: string[] } }
  | { terms: { boolean: string[] } }
  | { terms: { byte: string[] } }
  | { terms: { date: string[] } }
  | { terms: { date_nanos: string[] } }
  | { terms: { date_range: string[] } }
  | { terms: { double: string[] } }
  | { terms: { double_range: string[] } }
  | { terms: { flattened: string[] } }
  | { terms: { float: string[] } }
  | { terms: { float_range: string[] } }
  | { terms: { geo_point: string[] } }
  | { terms: { geo_shape: string[] } }
  | { terms: { half_float: string[] } }
  | { terms: { histogram: string[] } }
  | { terms: { integer: string[] } }
  | { terms: { integer_range: string[] } }
  | { terms: { ip: string[] } }
  | { terms: { ip_range: string[] } }
  | { terms: { keyword: string[] } }
  | { terms: { long: string[] } }
  | { terms: { long_range: string[] } }
  | { terms: { shape: string[] } }
  | { terms: { short: string[] } }
  | { terms: { text: string[] } }
>;

// We disable the complexity rule for the switch statement below
// eslint-disable-next-line complexity
export const getQueryFilterFromTypeValue = ({
  type,
  value,
  listId,
}: {
  type: Type;
  value: string[];
  listId: string;
  // We disable the consistent return since we want to use typescript for exhaustive type checks
  // eslint-disable-next-line consistent-return
}): QueryFilterType => {
  const filter: QueryFilterType = [{ term: { list_id: listId } }];
  switch (type) {
    case 'binary': {
      return [...filter, ...[{ terms: { binary: value } }]];
    }
    case 'boolean': {
      return [...filter, ...[{ terms: { boolean: value } }]];
    }
    case 'byte': {
      return [...filter, ...[{ terms: { byte: value } }]];
    }
    case 'date': {
      return [...filter, ...[{ terms: { date: value } }]];
    }
    case 'date_nanos': {
      return [...filter, ...[{ terms: { date_nanos: value } }]];
    }
    case 'date_range': {
      return [...filter, ...[{ terms: { date_range: value } }]];
    }
    case 'double': {
      return [...filter, ...[{ terms: { double: value } }]];
    }
    case 'double_range': {
      return [...filter, ...[{ terms: { double_range: value } }]];
    }
    case 'flattened': {
      return [...filter, ...[{ terms: { flattened: value } }]];
    }
    case 'float': {
      return [...filter, ...[{ terms: { float: value } }]];
    }
    case 'float_range': {
      return [...filter, ...[{ terms: { float_range: value } }]];
    }
    case 'geo_point': {
      return [...filter, ...[{ terms: { geo_point: value } }]];
    }
    case 'geo_shape': {
      return [...filter, ...[{ terms: { geo_shape: value } }]];
    }
    case 'half_float': {
      return [...filter, ...[{ terms: { half_float: value } }]];
    }
    case 'histogram': {
      return [...filter, ...[{ terms: { histogram: value } }]];
    }
    case 'integer': {
      return [...filter, ...[{ terms: { integer: value } }]];
    }
    case 'integer_range': {
      return [...filter, ...[{ terms: { integer_range: value } }]];
    }
    case 'ip': {
      return [...filter, ...[{ terms: { ip: value } }]];
    }
    case 'ip_range': {
      return [...filter, ...[{ terms: { ip_range: value } }]];
    }
    case 'keyword': {
      return [...filter, ...[{ terms: { keyword: value } }]];
    }
    case 'long': {
      return [...filter, ...[{ terms: { long: value } }]];
    }
    case 'long_range': {
      return [...filter, ...[{ terms: { long_range: value } }]];
    }
    case 'shape': {
      return [...filter, ...[{ terms: { shape: value } }]];
    }
    case 'short': {
      return [...filter, ...[{ terms: { short: value } }]];
    }
    case 'text': {
      return [...filter, ...[{ terms: { text: value } }]];
    }
  }
};
