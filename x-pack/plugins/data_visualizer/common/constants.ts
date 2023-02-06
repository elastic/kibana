/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { DocLinksStart } from '@kbn/core/public';

export const APP_ID = 'data_visualizer';
export const UI_SETTING_MAX_FILE_SIZE = 'fileUpload:maxFileSize';

export const MB = Math.pow(2, 20);
export const MAX_FILE_SIZE = '100MB';
export const MAX_FILE_SIZE_BYTES = 104857600; // 100MB

export const ABSOLUTE_MAX_FILE_SIZE_BYTES = 1073741274; // 1GB
export const FILE_SIZE_DISPLAY_FORMAT = '0,0.[0] b';

export const NO_TIME_FORMAT = 'null';

// Value to use in the Elasticsearch index mapping meta data to identify the
// index as having been created by the File Data Visualizer.
export const INDEX_META_DATA_CREATED_BY = 'file-data-visualizer';

export const FILE_FORMATS = {
  DELIMITED: 'delimited',
  NDJSON: 'ndjson',
  SEMI_STRUCTURED_TEXT: 'semi_structured_text',
  // XML: 'xml',
};

export const SUPPORTED_FIELD_TYPES = {
  BOOLEAN: 'boolean',
  CONFLICT: 'conflict',
  DATE: 'date',
  DATE_RANGE: 'date_range',
  GEO_POINT: 'geo_point',
  GEO_SHAPE: 'geo_shape',
  HISTOGRAM: 'histogram',
  IP: 'ip',
  IP_RANGE: 'ip_range',
  KEYWORD: 'keyword',
  MURMUR3: 'murmur3',
  NUMBER: 'number',
  NESTED: 'nested',
  STRING: 'string',
  TEXT: 'text',
  VERSION: 'version',
  UNKNOWN: 'unknown',
} as const;

export const OMIT_FIELDS: string[] = ['_source', '_type', '_index', '_id', '_version', '_score'];

export const NON_AGGREGATABLE_FIELD_TYPES = new Set<string>([
  KBN_FIELD_TYPES.GEO_SHAPE,
  KBN_FIELD_TYPES.HISTOGRAM,
]);

export const FILE_DATA_VIS_TAB_ID = 'fileDataViz';
export const applicationPath = `/app/home#/tutorial_directory/${FILE_DATA_VIS_TAB_ID}`;
export const featureTitle = i18n.translate('xpack.dataVisualizer.title', {
  defaultMessage: 'Upload a file',
});
export const featureId = `file_data_visualizer`;

const UNKNOWN_FIELD_TYPE_DESC = i18n.translate(
  'xpack.dataVisualizer.index.fieldNameDescription.unknownField',
  {
    defaultMessage: 'Unknown field',
  }
);

export function getFieldTypeDescription(type: string, docLinks: DocLinksStart) {
  switch (type) {
    case SUPPORTED_FIELD_TYPES.BOOLEAN:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.booleanField', {
        defaultMessage: 'True and false values',
      });
    case SUPPORTED_FIELD_TYPES.CONFLICT:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.conflictField', {
        defaultMessage: 'Field has values of different types. Resolve in Management > Data Views.',
      });
    case SUPPORTED_FIELD_TYPES.DATE:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.dateField', {
        defaultMessage: 'A date string or the number of seconds or milliseconds since 1/1/1970',
      });
    case SUPPORTED_FIELD_TYPES.DATE_RANGE:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.dateRangeField', {
        defaultMessage: 'Range of {dateFieldTypeLink} values. {viewSupportedDateFormatsLink}',
        values: {
          dateFieldTypeLink:
            `<a href=${docLinks.links.discover.dateFieldTypeDocs}
          target="_blank" rel="noopener">` +
            i18n.translate(
              'xpack.dataVisualizer.index.fieldNameDescription.dateRangeFieldLinkText',
              {
                defaultMessage: 'date',
              }
            ) +
            '</a>',
          viewSupportedDateFormatsLink:
            `<a href=${docLinks.links.discover.dateFormatsDocs}
          target="_blank" rel="noopener">` +
            i18n.translate(
              'xpack.dataVisualizer.index.fieldNameDescription.viewSupportedDateFormatsLinkText',
              {
                defaultMessage: 'View supported date formats.',
              }
            ) +
            '</a>',
        },
      });
    case SUPPORTED_FIELD_TYPES.GEO_POINT:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.geoPointField', {
        defaultMessage: 'Latitude and longitude points',
      });
    case SUPPORTED_FIELD_TYPES.GEO_SHAPE:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.geoShapeField', {
        defaultMessage: 'Complex shapes such as polygons',
      });
    case SUPPORTED_FIELD_TYPES.HISTOGRAM:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.histogramField', {
        defaultMessage: 'Pre-aggregated numerical values in the form of a histogram',
      });
    case SUPPORTED_FIELD_TYPES.IP:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.ipAddressField', {
        defaultMessage: 'IPv4 and IPv6 addresses',
      });
    case SUPPORTED_FIELD_TYPES.IP_RANGE:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.ipAddressRangeField', {
        defaultMessage: 'Range of IP values supporting either IPv4 or IPv6 (or mixed) addresses',
      });
    case SUPPORTED_FIELD_TYPES.MURMUR3:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.murmur3Field', {
        defaultMessage: 'Field that computes and stores hashes of values',
      });
    case SUPPORTED_FIELD_TYPES.NESTED:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.nestedField', {
        defaultMessage: 'JSON object that preserves the relationship between its subfields',
      });
    case SUPPORTED_FIELD_TYPES.NUMBER:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.numberField', {
        defaultMessage: 'Long, integer, short, byte, double, and float values',
      });
    case SUPPORTED_FIELD_TYPES.STRING:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.stringField', {
        defaultMessage: 'Full text such as the body of an email or a product description',
      });
    case SUPPORTED_FIELD_TYPES.TEXT:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.textField', {
        defaultMessage: 'Full text such as the body of an email or a product description',
      });
    case SUPPORTED_FIELD_TYPES.KEYWORD:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.keywordField', {
        defaultMessage:
          'Structured content such as an ID, email address, hostname, status code, or tag',
      });
    case SUPPORTED_FIELD_TYPES.VERSION:
      return i18n.translate('xpack.dataVisualizer.index.fieldNameDescription.versionField', {
        defaultMessage: 'Software versions. Supports {SemanticVersioningLink} precedence rules',
        values: {
          SemanticVersioningLink:
            `<a href="https://semver.org/"
            target="_blank" rel="noopener">` +
            i18n.translate(
              'xpack.dataVisualizer.index.advancedSettings.discover.fieldNameDescription.versionFieldLinkText',
              {
                defaultMessage: 'Semantic Versioning',
              }
            ) +
            '</a>',
        },
      });
    default:
      return UNKNOWN_FIELD_TYPE_DESC;
  }
}
