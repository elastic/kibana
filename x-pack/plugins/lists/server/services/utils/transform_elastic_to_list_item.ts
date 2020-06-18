/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

// We disable the complexity rule for the switch statement below
/* eslint-disable complexity */

import { SearchResponse } from 'elasticsearch';

import { ListItemArraySchema, SearchEsListItemSchema, Type } from '../../../common/schemas';
import { ErrorWithStatusCode } from '../../error_with_status_code';

export interface TransformElasticToListItemOptions {
  response: SearchResponse<SearchEsListItemSchema>;
  type: Type;
}

export const transformElasticToListItem = ({
  response,
  type,
}: TransformElasticToListItemOptions): ListItemArraySchema => {
  // We disable the consistent return and array-callback-return since we want to use typescript for exhaustive type checks
  // eslint-disable-next-line consistent-return, array-callback-return
  return response.hits.hits.map((hit) => {
    const {
      _id,
      _source: {
        created_at,
        updated_at,
        updated_by,
        created_by,
        list_id,
        tie_breaker_id,
        binary,
        boolean,
        byte,
        date,
        date_nanos,
        date_range,
        double,
        double_range,
        flattened,
        float,
        float_range,
        geo_point,
        geo_shape,
        half_float,
        histogram,
        integer,
        integer_range,
        ip,
        ip_range,
        keyword,
        long,
        long_range,
        shape,
        short,
        text,
        meta,
      },
    } = hit;

    const baseTypes = {
      created_at,
      created_by,
      id: _id,
      list_id,
      meta,
      tie_breaker_id,
      type,
      updated_at,
      updated_by,
    };

    switch (type) {
      case 'binary': {
        if (binary == null) {
          throw new ErrorWithStatusCode('Was expecting binary to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: binary,
        };
      }
      case 'boolean': {
        if (boolean == null) {
          throw new ErrorWithStatusCode('Was expecting boolean to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: boolean,
        };
      }
      case 'byte': {
        if (byte == null) {
          throw new ErrorWithStatusCode('Was expecting byte to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: byte,
        };
      }
      case 'date': {
        if (date == null) {
          throw new ErrorWithStatusCode('Was expecting date to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: date,
        };
      }
      case 'date_nanos': {
        if (date_nanos == null) {
          throw new ErrorWithStatusCode('Was expecting date_nanos to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: date_nanos,
        };
      }
      case 'date_range': {
        if (date_range == null) {
          throw new ErrorWithStatusCode('Was expecting date_range to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: date_range,
        };
      }
      case 'double': {
        if (double == null) {
          throw new ErrorWithStatusCode('Was expecting double to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: double,
        };
      }
      case 'double_range': {
        if (double_range == null) {
          throw new ErrorWithStatusCode('Was expecting double_range to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: double_range,
        };
      }
      case 'flattened': {
        if (flattened == null) {
          throw new ErrorWithStatusCode('Was expecting flattened to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: flattened,
        };
      }
      case 'float': {
        if (float == null) {
          throw new ErrorWithStatusCode('Was expecting float to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: float,
        };
      }
      case 'float_range': {
        if (float_range == null) {
          throw new ErrorWithStatusCode('Was expecting float_range to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: float_range,
        };
      }
      case 'geo_point': {
        if (geo_point == null) {
          throw new ErrorWithStatusCode('Was expecting geo_point to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: geo_point,
        };
      }
      case 'geo_shape': {
        if (geo_shape == null) {
          throw new ErrorWithStatusCode('Was expecting geo_shape to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: geo_shape,
        };
      }
      case 'half_float': {
        if (half_float == null) {
          throw new ErrorWithStatusCode('Was expecting half_float to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: half_float,
        };
      }
      case 'histogram': {
        if (histogram == null) {
          throw new ErrorWithStatusCode('Was expecting histogram to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: histogram,
        };
      }
      case 'integer': {
        if (integer == null) {
          throw new ErrorWithStatusCode('Was expecting integer to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: integer,
        };
      }
      case 'integer_range': {
        if (integer_range == null) {
          throw new ErrorWithStatusCode(
            'Was expecting integer_range to not be null/undefined',
            400
          );
        }
        return {
          ...baseTypes,
          value: integer_range,
        };
      }
      case 'ip': {
        if (ip == null) {
          throw new ErrorWithStatusCode('Was expecting ip to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: ip,
        };
      }
      case 'ip_range': {
        if (ip_range == null) {
          throw new ErrorWithStatusCode('Was expecting ip_range to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: ip_range,
        };
      }
      case 'keyword': {
        if (keyword == null) {
          throw new ErrorWithStatusCode('Was expecting keyword to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: keyword,
        };
      }
      case 'long': {
        if (long == null) {
          throw new ErrorWithStatusCode('Was expecting long to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: long,
        };
      }
      case 'long_range': {
        if (long_range == null) {
          throw new ErrorWithStatusCode('Was expecting long_range to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: long_range,
        };
      }
      case 'shape': {
        if (shape == null) {
          throw new ErrorWithStatusCode('Was expecting shape to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: shape,
        };
      }
      case 'short': {
        if (short == null) {
          throw new ErrorWithStatusCode('Was expecting short to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: short,
        };
      }
      case 'text': {
        if (text == null) {
          throw new ErrorWithStatusCode('Was expecting short to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: text,
        };
      }
    }
  });
};
