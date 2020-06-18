/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsDataTypeUnion, Type } from '../../../common/schemas';

// disable complexity for the large case switch
// eslint-disable-next-line complexity
export const transformListItemToElasticQuery = ({
  type,
  value,
}: {
  type: Type;
  value: string;
  // We disable the consistent-return so we can use TypeScript exhaustive checks
  // eslint-disable-next-line consistent-return
}): EsDataTypeUnion => {
  switch (type) {
    case 'binary': {
      return {
        binary: value,
      };
    }
    case 'boolean': {
      return {
        boolean: value,
      };
    }
    case 'byte': {
      return {
        byte: value,
      };
    }
    case 'date': {
      return {
        date: value,
      };
    }
    case 'date_nanos': {
      return {
        date_nanos: value,
      };
    }
    case 'date_range': {
      return {
        date_range: value,
      };
    }
    case 'double': {
      return {
        double: value,
      };
    }
    case 'double_range': {
      return {
        double_range: value,
      };
    }
    case 'flattened': {
      return {
        flattened: value,
      };
    }
    case 'float': {
      return {
        float: value,
      };
    }
    case 'float_range': {
      return {
        float_range: value,
      };
    }
    case 'geo_point': {
      return {
        geo_point: value,
      };
    }
    case 'geo_shape': {
      return {
        geo_shape: value,
      };
    }
    case 'half_float': {
      return {
        half_float: value,
      };
    }
    case 'histogram': {
      return {
        histogram: value,
      };
    }
    case 'integer': {
      return {
        integer: value,
      };
    }
    case 'integer_range': {
      return {
        integer_range: value,
      };
    }
    case 'ip': {
      return {
        ip: value,
      };
    }
    case 'ip_range': {
      return {
        ip_range: value,
      };
    }
    case 'keyword': {
      return {
        keyword: value,
      };
    }
    case 'long': {
      return {
        long: value,
      };
    }
    case 'long_range': {
      return {
        long_range: value,
      };
    }
    case 'shape': {
      return {
        shape: value,
      };
    }
    case 'short': {
      return {
        short: value,
      };
    }
    case 'text': {
      return {
        text: value,
      };
    }
  }
};
