/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function getFieldTypeName(type: string) {
  switch (type) {
    case 'boolean':
      return i18n.translate('xpack.securitySolution.fieldNameIcons.booleanAriaLabel', {
        defaultMessage: 'Boolean field',
      });
    case 'conflict':
      return i18n.translate('xpack.securitySolution.fieldNameIcons.conflictFieldAriaLabel', {
        defaultMessage: 'Conflicting field',
      });
    case 'date':
      return i18n.translate('xpack.securitySolution.fieldNameIcons.dateFieldAriaLabel', {
        defaultMessage: 'Date field',
      });
    case 'geo_point':
      return i18n.translate('xpack.securitySolution.fieldNameIcons.geoPointFieldAriaLabel', {
        defaultMessage: 'Geo point field',
      });
    case 'geo_shape':
      return i18n.translate('xpack.securitySolution.fieldNameIcons.geoShapeFieldAriaLabel', {
        defaultMessage: 'Geo shape field',
      });
    case 'ip':
      return i18n.translate('xpack.securitySolution.fieldNameIcons.ipAddressFieldAriaLabel', {
        defaultMessage: 'IP address field',
      });
    case 'murmur3':
      return i18n.translate('xpack.securitySolution.fieldNameIcons.murmur3FieldAriaLabel', {
        defaultMessage: 'Murmur3 field',
      });
    case 'number':
      return i18n.translate('xpack.securitySolution.fieldNameIcons.numberFieldAriaLabel', {
        defaultMessage: 'Number field',
      });
    case 'source':
      // Note that this type is currently not provided, type for _source is undefined
      return i18n.translate('xpack.securitySolution.fieldNameIcons.sourceFieldAriaLabel', {
        defaultMessage: 'Source field',
      });
    case 'string':
      return i18n.translate('xpack.securitySolution.fieldNameIcons.stringFieldAriaLabel', {
        defaultMessage: 'String field',
      });
    case 'nested':
      return i18n.translate('xpack.securitySolution.fieldNameIcons.nestedFieldAriaLabel', {
        defaultMessage: 'Nested field',
      });
    default:
      return i18n.translate('xpack.securitySolution.fieldNameIcons.unknownFieldAriaLabel', {
        defaultMessage: 'Unknown field',
      });
  }
}
