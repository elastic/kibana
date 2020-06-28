/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EsDataTypeGeoPoint,
  EsDataTypeGeoShape,
  EsDataTypeRangeTerm,
  EsDataTypeUnion,
  SerializerOrUndefined,
  Type,
  esDataTypeGeoShape,
  esDataTypeRangeTerm,
  esDataTypeUnion,
} from '../../../common/schemas';
import { ErrorWithStatusCode } from '../../error_with_status_code';

export const DEFAULT_DATE_REGEX = RegExp('(?<gte>.+),(?<lte>.+)|(?<value>.+)');
export const DEFAULT_LTE_GTE_REGEX = RegExp('(?<gte>.+)-(?<lte>.+)|(?<value>.+)');
export const DEFAULT_GEO_REGEX = RegExp('(?<lat>.+),(?<lon>.+)');

export const transformListItemToElasticQuery = ({
  serializer,
  type,
  value,
}: {
  type: Type;
  value: string;
  serializer: SerializerOrUndefined;
}): EsDataTypeUnion | null => {
  switch (type) {
    case 'shape':
    case 'geo_shape': {
      const shape = serializeGeoShape({
        defaultSerializer: DEFAULT_GEO_REGEX,
        serializer,
        type,
        value,
      });
      if (shape != null) {
        return shape;
      } else {
        // TODO: Return null or write these to a new index that represents error conditions
        throw new ErrorWithStatusCode(
          `Unknown list item to transform to elastic query, type: ${type}, value: ${value}`,
          400
        );
      }
    }
    case 'geo_point': {
      const point = serializeGeoPoint({ defaultSerializer: DEFAULT_GEO_REGEX, serializer, value });
      if (point != null) {
        return point;
      } else {
        // TODO: Return null or write these to a new index that represents error conditions
        throw new ErrorWithStatusCode(
          `Unknown list item to transform to elastic query, type: ${type}, value: ${value}`,
          400
        );
      }
    }
    case 'ip_range': {
      const range = serializeIpRange({
        defaultSerializer: DEFAULT_LTE_GTE_REGEX,
        serializer,
        value,
      });
      if (range != null) {
        return range;
      } else {
        // TODO: Return null or write these to a new index that represents error conditions
        throw new ErrorWithStatusCode(
          `Unknown list item to transform to elastic query, type: ${type}, value: ${value}`,
          400
        );
      }
    }
    case 'date_range': {
      const range = serializeRanges({
        defaultSerializer: DEFAULT_DATE_REGEX,
        serializer,
        type,
        value,
      });
      if (range != null) {
        return range;
      } else {
        // TODO: Return null or write these to a new index that represents error conditions
        throw new ErrorWithStatusCode(
          `Unknown list item to transform to elastic query, type: ${type}, value: ${value}`,
          400
        );
      }
    }
    case 'double_range':
    case 'float_range':
    case 'integer_range':
    case 'long_range': {
      const range = serializeRanges({
        defaultSerializer: DEFAULT_LTE_GTE_REGEX,
        serializer,
        type,
        value,
      });
      if (range != null) {
        return range;
      } else {
        // TODO: Return null or write these to a new index that represents error conditions
        throw new ErrorWithStatusCode(
          `Unknown list item to transform to elastic query, type: ${type}, value: ${value}`,
          400
        );
      }
    }
    default: {
      // TODO: Add the ability to search for the regex of '(?<value>)'?
      const unionType = { [type]: value };
      if (esDataTypeUnion.is(unionType)) {
        return unionType;
      } else {
        throw new ErrorWithStatusCode(
          `Unknown list item to transform to elastic query, type: ${type}, value: ${value}`,
          400
        );
      }
    }
  }
};

export const serializeGeoShape = ({
  defaultSerializer,
  serializer,
  value,
  type,
}: {
  value: string;
  serializer: SerializerOrUndefined;
  defaultSerializer: RegExp;
  type: 'geo_shape' | 'shape';
}): EsDataTypeGeoShape | null => {
  const regExpSerializer = serializer != null ? RegExp(serializer) : defaultSerializer;
  const parsed = regExpSerializer.exec(value);

  // we only support lat/lon for point and represent it as Well Known Text (WKT)
  if (parsed?.groups?.lat != null && parsed?.groups?.lon != null) {
    const returnType = { [type]: `POINT(${parsed.groups.lon} ${parsed.groups.lat})` };
    if (esDataTypeGeoShape.is(returnType)) {
      return returnType;
    } else {
      return null;
    }
  } else {
    // This should be in Well Known Text (WKT) at this point so let's return it as is
    const returnType = { [type]: value };
    if (esDataTypeGeoShape.is(returnType)) {
      return returnType;
    } else {
      return null;
    }
  }
};

export const serializeGeoPoint = ({
  defaultSerializer,
  serializer,
  value,
}: {
  value: string;
  serializer: SerializerOrUndefined;
  defaultSerializer: RegExp;
}): EsDataTypeGeoPoint | null => {
  const regExpSerializer = serializer != null ? RegExp(serializer) : defaultSerializer;
  const parsed = regExpSerializer.exec(value);

  if (parsed?.groups?.lat != null && parsed?.groups?.lon != null) {
    return {
      geo_point: { lat: parsed.groups.lat, lon: parsed.groups.lon },
    };
  } else {
    // This might be in Well Known Text (WKT) so let's return it as is
    return { geo_point: value };
  }
};

export const serializeIpRange = ({
  defaultSerializer,
  serializer,
  value,
}: {
  value: string;
  serializer: SerializerOrUndefined;
  defaultSerializer: RegExp;
}): EsDataTypeRangeTerm | null => {
  const regExpSerializer = serializer != null ? RegExp(serializer) : defaultSerializer;
  const parsed = regExpSerializer.exec(value);

  if (parsed?.groups?.lte != null && parsed?.groups?.gte != null) {
    return {
      ip_range: { gte: parsed.groups.gte, lte: parsed.groups.lte },
    };
  } else if (parsed?.groups?.value != null) {
    // This is a CIDR string
    if (parsed.groups.value.includes('/')) {
      return {
        ip_range: parsed.groups.value,
      };
    } else {
      return {
        ip_range: { gte: parsed.groups.value, lte: parsed.groups.value },
      };
    }
  } else {
    return null;
  }
};

export const serializeRanges = ({
  type,
  serializer,
  value,
  defaultSerializer,
}: {
  type: 'long_range' | 'date_range' | 'double_range' | 'float_range' | 'integer_range';
  value: string;
  serializer: SerializerOrUndefined;
  defaultSerializer: RegExp;
}): EsDataTypeRangeTerm | null => {
  const regExpSerializer = serializer != null ? RegExp(serializer) : defaultSerializer;
  const parsed = regExpSerializer.exec(value);

  if (parsed?.groups?.lte != null && parsed?.groups?.gte != null) {
    const returnType = {
      [type]: { gte: parsed.groups.gte, lte: parsed.groups.lte },
    };
    if (esDataTypeRangeTerm.is(returnType)) {
      return returnType;
    } else {
      return null;
    }
  } else if (parsed?.groups?.value != null) {
    const returnType = {
      [type]: { gte: parsed.groups.value, lte: parsed.groups.value },
    };
    if (esDataTypeRangeTerm.is(returnType)) {
      return returnType;
    } else {
      return null;
    }
  } else {
    return null;
  }
};
