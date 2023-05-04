/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue, schema, TypeOf } from '@kbn/config-schema';

const exportTypesSchema = schema.arrayOf(schema.string(), { defaultValue: ['CSV'] });
const KibanaServerSchema = schema.object({
  exportTypes: exportTypesSchema,
});

const CsvSchema = schema.object({
  checkForFormulas: schema.boolean({ defaultValue: true }),
  escapeFormulaValues: schema.boolean({ defaultValue: false }),
  enablePanelActionDownload: schema.boolean({ defaultValue: true }),
  maxSizeBytes: schema.oneOf([schema.number(), schema.byteSize()], {
    defaultValue: ByteSizeValue.parse('10mb'),
  }),
  useByteOrderMarkEncoding: schema.boolean({ defaultValue: false }),
  scroll: schema.object({
    duration: schema.string({
      defaultValue: '30s', // this value is passed directly to ES, so string only format is preferred
      validate(value) {
        if (!/^[0-9]+(d|h|m|s|ms|micros|nanos)$/.test(value)) {
          return 'must be a duration string';
        }
      },
    }),
    size: schema.number({ defaultValue: 500 }),
  }),
});

export const ConfigSchema = schema.object({
  csv: CsvSchema,
  //   png: PngSchema,
  //   pdf: PdfSchema,
});

export type ReportingExportTypesConfigType = TypeOf<typeof ConfigSchema>;
