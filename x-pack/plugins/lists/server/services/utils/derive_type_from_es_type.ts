/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable complexity */

import { SearchEsListItemSchema, Type } from '../../../common/schemas';
import { ErrorWithStatusCode } from '../../error_with_status_code';

interface DeriveTypeFromItemOptions {
  item: SearchEsListItemSchema;
}

export const deriveTypeFromItem = ({ item }: DeriveTypeFromItemOptions): Type => {
  if (item.binary != null) {
    return 'binary';
  } else if (item.boolean != null) {
    return 'boolean';
  } else if (item.byte != null) {
    return 'byte';
  } else if (item.date != null) {
    return 'date';
  } else if (item.date_nanos != null) {
    return 'date_nanos';
  } else if (item.date_range != null) {
    return 'date_range';
  } else if (item.double != null) {
    return 'double';
  } else if (item.double_range != null) {
    return 'double_range';
  } else if (item.flattened != null) {
    return 'flattened';
  } else if (item.float != null) {
    return 'float';
  } else if (item.float_range != null) {
    return 'float_range';
  } else if (item.geo_point != null) {
    return 'geo_point';
  } else if (item.geo_shape != null) {
    return 'geo_shape';
  } else if (item.half_float != null) {
    return 'half_float';
  } else if (item.histogram != null) {
    return 'histogram';
  } else if (item.integer != null) {
    return 'integer';
  } else if (item.integer_range != null) {
    return 'integer_range';
  } else if (item.ip != null) {
    return 'ip';
  } else if (item.ip_range != null) {
    return 'ip_range';
  } else if (item.keyword != null) {
    return 'keyword';
  } else if (item.integer != null) {
    return 'integer';
  } else if (item.long != null) {
    return 'long';
  } else if (item.long_range != null) {
    return 'long_range';
  } else if (item.shape != null) {
    return 'shape';
  } else if (item.short != null) {
    return 'short';
  } else if (item.text != null) {
    return 'text';
  } else {
    throw new ErrorWithStatusCode(
      `Was expecting a valid type from the Elastic Search List Item such as ip or keyword but did not found one here ${JSON.stringify(
        item
      )}`,
      400
    );
  }
};
