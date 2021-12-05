/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import Papa from 'papaparse';

import { FieldCopyAction, Pipeline, Processor } from '../../common/types';

const REQUIRED_CSV_HEADERS = ['source_field', 'destination_field'];

const FORMAT_ACTIONS = [
  'uppercase',
  'lowercase',
  'to_boolean',
  'to_integer',
  'to_float',
  'to_array',
  'to_string',
  'parse_timestamp',
] as const;

type FormatAction = typeof FORMAT_ACTIONS[number];
type TimeStampFormat = 'UNIX' | 'UNIX_MS' | 'ISO8601' | 'TAI64N';

interface Mapping {
  source_field: string;
  destination_field?: string;
  copy_action?: FieldCopyAction;
  format_action?: FormatAction;
  timestamp_format?: TimeStampFormat;
}

interface Row extends Mapping {
  notes?: string;
  [key: string]: unknown; // allow unknown columns
}

export function csvToIngestPipeline(file: string, copyAction: FieldCopyAction) {
  if (file.trim().length === 0) {
    throw new Error(
      i18n.translate('xpack.ingestPipelines.csvToIngestPipeline.error.emptyFileErrors', {
        defaultMessage: 'Error reading file: The file provided is empty.',
      })
    );
  }

  const fileData = parseAndValidate(file);
  const mapping = convertCsvToMapping(fileData, copyAction);
  return generatePipeline(mapping);
}

function parseAndValidate(file: string) {
  const config: Papa.ParseConfig = {
    header: true,
    skipEmptyLines: true,
  };

  const { data, errors, meta } = Papa.parse(file, config);
  if (errors.length > 0) {
    throw new Error(
      i18n.translate('xpack.ingestPipelines.mapToIngestPipeline.error.parseErrors', {
        defaultMessage:
          'Error reading file: An unexpected issue has occured during the processing of the file.',
      })
    );
  }

  const missingHeaders = REQUIRED_CSV_HEADERS.reduce<string[]>((acc, header) => {
    if (meta.fields.includes(header)) {
      return acc;
    }
    return [...acc, header];
  }, []);

  if (missingHeaders.length > 0) {
    throw new Error(
      i18n.translate('xpack.ingestPipelines.mapToIngestPipeline.error.missingHeaders', {
        defaultMessage:
          'Missing required headers: Include {missingHeaders} {missingHeadersCount, plural, one {header} other {headers}} in the CSV file.',
        values: {
          missingHeaders: missingHeaders.join(', '),
          missingHeadersCount: missingHeaders.length,
        },
      })
    );
  }

  return data;
}

function convertCsvToMapping(rows: Row[], copyFieldAction: FieldCopyAction) {
  const mapping = new Map<string, Mapping>();

  if (rows.length < 1) {
    return mapping;
  }

  for (const row of rows) {
    if (!row.source_field || !row.source_field.trim()) {
      // Skip rows that don't have a source field
      continue;
    }
    if (
      (!row.destination_field || !row.destination_field.trim()) &&
      (!row.format_action || !row.format_action.trim())
    ) {
      // Skip if no destination field and no format field provided since it's possible to reformat a source field by itself
      continue;
    }

    const source = row.source_field.trim();
    let destination = row.destination_field && row.destination_field.trim();
    const copyAction = (row.copy_action && row.copy_action.trim()) || copyFieldAction;
    let formatAction = row.format_action && (row.format_action.trim() as FormatAction);
    let timestampFormat = row.timestamp_format && (row.timestamp_format.trim() as TimeStampFormat);

    if (destination === '@timestamp' && !Boolean(timestampFormat)) {
      // If @timestamp is the destination and the user does not specify how to format the conversion, convert it to UNIX_MS
      formatAction = 'parse_timestamp';
      timestampFormat = 'UNIX_MS';
    } else if (!destination && formatAction) {
      // If the destination field is empty but a format action is provided, then assume we're formating the source field.
      destination = source;
    }

    if (formatAction && !FORMAT_ACTIONS.includes(formatAction)) {
      const formatActions = FORMAT_ACTIONS.join(', ');
      throw new Error(
        i18n.translate('xpack.ingestPipelines.mapToIngestPipeline.error.invalidFormatAction', {
          defaultMessage:
            'Invalid format action [{ formatAction }]. The valid actions are {formatActions}',
          values: { formatAction, formatActions },
        })
      );
    }

    mapping.set(`${source}+${destination}`, {
      source_field: source,
      destination_field: destination,
      copy_action: copyAction as FieldCopyAction,
      format_action: formatAction as FormatAction,
      timestamp_format: timestampFormat as TimeStampFormat,
    });
  }

  return mapping;
}

function generatePipeline(mapping: Map<string, Mapping>) {
  const processors: Processor[] = [];
  for (const [, row] of mapping) {
    if (hasSameName(row) && !row.format_action) continue;

    const source = row.source_field;
    const dest = row.destination_field;

    // Copy/Rename
    if (dest && `parse_timestamp` !== row.format_action) {
      let processor = {};
      if ('copy' === row.copy_action) {
        processor = {
          set: {
            field: dest,
            value: `{{${source}}}`,
            if: fieldPresencePredicate(source),
          },
        };
      } else {
        processor = {
          rename: {
            field: source,
            target_field: dest,
            ignore_missing: true,
          },
        };
      }
      processors.push(processor);
    }

    if (row.format_action) {
      // Modify the source_field if there's no destination_field (no rename, just a type change)
      const affectedField = dest || source;

      let type = '';
      if ('to_boolean' === row.format_action) type = 'boolean';
      else if ('to_integer' === row.format_action) type = 'long';
      else if ('to_string' === row.format_action) type = 'string';
      else if ('to_float' === row.format_action) type = 'float';

      let processor: Processor | undefined;

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
            field: source,
            target_field: dest,
            formats: [row.timestamp_format],
            timezone: 'UTC',
            ignore_failure: true,
          },
        };
      }

      if (processor) {
        processors.push(processor!);
      }
    }
  }
  return { processors } as Pipeline;
}

function fieldPresencePredicate(field: string) {
  if ('@timestamp' === field) {
    return "ctx.containsKey('@timestamp')";
  }

  const fieldPath = field.split('.');
  if (fieldPath.length === 1) {
    return `ctx.${field} != null`;
  }

  return `ctx.${fieldPath.join('?.')} != null`;
}

function hasSameName(row: Mapping) {
  return row.source_field === row.destination_field;
}
