/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EsDataTypeGeoPoint,
  EsDataTypeGeoShape,
  EsDataTypeRangeTerm,
  EsDataTypeSingle,
  EsDataTypeUnion,
  SerializerOrUndefined,
  Type,
  esDataTypeGeoShape,
  esDataTypeRangeTerm,
  esDataTypeSingle,
} from '../../../common/schemas';

export const DEFAULT_DATE_REGEX = RegExp('(?<gte>.+),(?<lte>.+)|(?<value>.+)');
export const DEFAULT_LTE_GTE_REGEX = RegExp('(?<gte>.+)-(?<lte>.+)|(?<value>.+)');
export const DEFAULT_GEO_REGEX = RegExp('(?<lat>.+),(?<lon>.+)');
export const DEFAULT_SINGLE_REGEX = RegExp('(?<value>.+)');

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
      return serializeGeoShape({
        defaultSerializer: DEFAULT_GEO_REGEX,
        serializer,
        type,
        value,
      });
    }
    case 'geo_point': {
      return serializeGeoPoint({ defaultSerializer: DEFAULT_GEO_REGEX, serializer, value });
    }
    case 'ip_range': {
      return serializeIpRange({
        defaultSerializer: DEFAULT_LTE_GTE_REGEX,
        serializer,
        value,
      });
    }
    case 'date_range': {
      return serializeRanges({
        defaultSerializer: DEFAULT_DATE_REGEX,
        serializer,
        type,
        value,
      });
    }
    case 'double_range':
    case 'float_range':
    case 'integer_range':
    case 'long_range': {
      return serializeRanges({
        defaultSerializer: DEFAULT_LTE_GTE_REGEX,
        serializer,
        type,
        value,
      });
    }
    default: {
      return serializeSingleValue({
        defaultSerializer: DEFAULT_SINGLE_REGEX,
        serializer,
        type,
        value,
      });
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
  const parsed = regExpSerializer.exec(value.trim());

  // we only support lat/lon for point and represent it as Well Known Text (WKT)
  if (parsed?.groups?.lat != null && parsed?.groups?.lon != null) {
    const unionType = { [type]: `POINT (${parsed.groups.lon.trim()} ${parsed.groups.lat.trim()})` };
    if (esDataTypeGeoShape.is(unionType)) {
      return unionType;
    } else {
      return null;
    }
  } else {
    // This should be in Well Known Text (WKT) at this point so let's return it as is
    const unionType = { [type]: value.trim() };
    if (esDataTypeGeoShape.is(unionType)) {
      return unionType;
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
  const parsed = regExpSerializer.exec(value.trim());

  if (parsed?.groups?.lat != null && parsed?.groups?.lon != null) {
    return {
      geo_point: { lat: parsed.groups.lat.trim(), lon: parsed.groups.lon.trim() },
    };
  } else {
    // This might be in Well Known Text (WKT) so let's return it as is
    return { geo_point: value.trim() };
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
  const parsed = regExpSerializer.exec(value.trim());

  if (parsed?.groups?.lte != null && parsed?.groups?.gte != null) {
    return {
      ip_range: { gte: parsed.groups.gte.trim(), lte: parsed.groups.lte.trim() },
    };
  } else if (parsed?.groups?.value != null) {
    // This is a CIDR string based on the serializer involving value such as (?<value>.+)
    if (parsed.groups.value.includes('/')) {
      return {
        ip_range: parsed.groups.value.trim(),
      };
    } else {
      return {
        ip_range: { gte: parsed.groups.value.trim(), lte: parsed.groups.value.trim() },
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
  const parsed = regExpSerializer.exec(value.trim());

  if (parsed?.groups?.lte != null && parsed?.groups?.gte != null) {
    const unionType = {
      [type]: { gte: parsed.groups.gte.trim(), lte: parsed.groups.lte.trim() },
    };
    if (esDataTypeRangeTerm.is(unionType)) {
      return unionType;
    } else {
      return null;
    }
  } else if (parsed?.groups?.value != null) {
    const unionType = {
      [type]: { gte: parsed.groups.value.trim(), lte: parsed.groups.value.trim() },
    };
    if (esDataTypeRangeTerm.is(unionType)) {
      return unionType;
    } else {
      return null;
    }
  } else {
    return null;
  }
};

export const serializeSingleValue = ({
  serializer,
  value,
  defaultSerializer,
  type,
}: {
  value: string;
  serializer: SerializerOrUndefined;
  type:
    | 'binary'
    | 'boolean'
    | 'byte'
    | 'date'
    | 'date_nanos'
    | 'double'
    | 'float'
    | 'half_float'
    | 'integer'
    | 'ip'
    | 'long'
    | 'shape'
    | 'short'
    | 'text'
    | 'keyword';
  defaultSerializer: RegExp;
}): EsDataTypeSingle | null => {
  const regExpSerializer = serializer != null ? RegExp(serializer) : defaultSerializer;
  const parsed = regExpSerializer.exec(value.trim());

  if (parsed?.groups?.value != null) {
    const unionType = { [type]: `${parsed.groups.value.trim()}` };
    if (esDataTypeSingle.is(unionType)) {
      return unionType;
    } else {
      return null;
    }
  } else {
    const unionType = { [type]: value };
    if (esDataTypeSingle.is(unionType)) {
      return unionType;
    } else {
      return null;
    }
  }
};
