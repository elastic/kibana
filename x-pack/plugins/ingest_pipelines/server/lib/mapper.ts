/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import Papa from 'papaparse';
import { FieldCopyAction, Pipeline } from '../../common/types';

const REQUIRED_CSV_HEADERS = ['source_field', 'destination_field'];

const ACCEPTED_FORMAT_ACTIONS = [
  'uppercase',
  'lowercase',
  'to_boolean',
  'to_integer',
  'to_float',
  'to_array',
  'to_string',
  'parse_timestamp',
];

interface Mapping {
  source_field: string;
  destination_field: string;
  copy_action?: string;
  format_action?: string;
  timestamp_format?: string;
}

export function mapToIngestPipeline(file: string, copyAction: FieldCopyAction) {
  if (!file || file.length === 0) {
    return null;
  }

  const fileData = parseAndValidate(file);
  const mapping = convertCsvToMapping(fileData, copyAction);

  if (mapping === null) {
    return null;
  }
  return generatePipeline(mapping);
}

function parseAndValidate(file: string) {
  const config: Papa.ParseConfig = {
    header: true,
    skipEmptyLines: true,
  };

  const parseOutput = Papa.parse(file, config);

  const { data, errors, meta } = parseOutput;
  if (errors.length > 0) {
    throw new Error(
      i18n.translate('xpack.ingestPipelines.mapToIngestPipeline.error.parseErrors', {
        defaultMessage:
          'Error reading file: An unexpected issue occured during the processing of the file',
      })
    );
  }

  const includesCheck = (arr: string[], target: string[]) => target.every((v) => arr.includes(v));
  if (!includesCheck(meta.fields, REQUIRED_CSV_HEADERS)) {
    const required = REQUIRED_CSV_HEADERS.join(', ');

    throw new Error(
      i18n.translate('xpack.ingestPipelines.mapToIngestPipeline.error.missingHeaders', {
        defaultMessage: 'Required headers are missing: Required {required} missing in CSV',
        values: { required },
      })
    );
  }

  return data;
}

function convertCsvToMapping(rows: any[], copyFieldAction: FieldCopyAction) {
  const mapping = new Map();

  if (rows.length < 1) {
    return null;
  }

  for (const row of rows) {
    // Skip rows that don't have a source field
    if (!row.source_field || !row.source_field.trim()) continue;
    // Skip if no destination field and no format field provided since it's possible to reformat a source field by itself
    if (
      (!row.destination_field || !row.destination_field.trim()) &&
      (!row.format_field || !row.format_field.trim())
    )
      continue;

    const source = row.source_field.trim();
    let destination = (row.destination_field && row.destination_field.trim()) || undefined;
    const copyAction = (row.copy_action && row.copy_action.trim()) || copyFieldAction;
    let formatAction = row.format_action && row.format_action.trim();
    let timestampFormat = row.timestamp_format && row.timestamp_format.trim();

    // If @timestamp is the destination and the user does not specify how to format the conversion, convert it to UNIX_MS
    if (
      row.destination_field === '@timestamp' &&
      (!row.timestamp_format || !row.timestamp_format.trim())
    ) {
      formatAction = 'parse_timestamp';
      timestampFormat = 'UNIX_MS';
    }
    // If the destination field is empty but a format action is provided, then assume we're formating the source field.
    else if (!destination && formatAction) {
      destination = source;
    }

    if (formatAction && !ACCEPTED_FORMAT_ACTIONS.includes(formatAction)) {
      const accepted = ACCEPTED_FORMAT_ACTIONS.join(', ');
      throw new Error(
        i18n.translate('xpack.ingestPipelines.mapToIngestPipeline.error.unacceptedFormatAction', {
          defaultMessage: 'Unaccepted format action: Acceptable actions {accepted}',
          values: { accepted },
        })
      );
    }

    mapping.set(source + '+' + destination, {
      source_field: source,
      destination_field: destination,
      copy_action: copyAction,
      format_action: formatAction,
      timestamp_format: timestampFormat,
    } as Mapping);
  }

  return mapping;
}

function generatePipeline(mapping: Map<string, Mapping>) {
  const processors = [];
  for (const [, row] of mapping) {
    if (hasSameName(row) && !row.format_action) continue;

    const source = row.source_field;

    // Copy/Rename
    if (row.destination_field && `parse_timestamp` !== row.format_action) {
      let processor = {};
      if ('copy' === row.copy_action) {
        processor = {
          set: {
            field: row.destination_field,
            value: '{{' + source + '}}',
            if: fieldPresencePredicate(source),
          },
        };
      } else {
        processor = {
          rename: {
            field: source,
            target_field: row.destination_field,
            ignore_missing: true,
          },
        };
      }
      processors.push(processor);
    }

    if (row.format_action) {
      // Modify the source_field if there's no destination_field (no rename, just a type change)
      const affectedField = row.destination_field || row.source_field;

      let type = '';
      if ('to_boolean' === row.format_action) type = 'boolean';
      else if ('to_integer' === row.format_action) type = 'long';
      else if ('to_string' === row.format_action) type = 'string';
      else if ('to_float' === row.format_action) type = 'float';

      let processor = {};

      if (type) {
        processor = {
          convert: {
            field: affectedField,
            type,
            ignore_missing: true,
            ignore_failure: true,
          },
        };
      } else if ('uppercase' === row.format_action || 'lowercase' === row.format_action) {
        processor = {
          [row.format_action]: {
            field: affectedField,
            ignore_missing: true,
            ignore_failure: true,
          },
        };
      } else if ('to_array' === row.format_action) {
        processor = {
          append: {
            field: affectedField,
            value: [],
            ignore_failure: true,
            if: fieldPresencePredicate(affectedField),
          },
        };
      } else if ('parse_timestamp' === row.format_action) {
        processor = {
          date: {
            field: row.source_field,
            target_field: row.destination_field,
            formats: [row.timestamp_format],
            timezone: 'UTC',
            ignore_failure: true,
          },
        };
      }
      processors.push(processor);
    }
  }
  return { processors } as Pipeline;
}

function fieldPresencePredicate(field: string) {
  if ('@timestamp' === field) {
    return "ctx.containsKey('@timestamp')";
  }

  const fieldLevels = field.split('.');
  if (fieldLevels.length === 1) {
    return `ctx.${field} != null`;
  }

  const nullSafe = fieldLevels
    .slice(0, -1)
    .map((f) => `${f}?`)
    .join('.');
  return `ctx.${nullSafe}.${fieldLevels.slice(-1)[0]} != null`;
}

function hasSameName(row: Mapping) {
  return !row.destination_field || row.source_field === row.destination_field;
}
