/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Papa from 'papaparse';
import { FieldCopyAction } from '../../common';
import { Mapping } from '../types';

const REQUIRED_CSV_HEADERS = [
  'source_field', 
  'destination_field'
]

const ACCEPTED_FORMAT_ACTIONS = [
  'uppercase', 
  'lowercase', 
  'to_boolean', 
  'to_integer',
  'to_float', 
  'to_array', 
  'to_string',
  'parse_timestamp',
]

export function mapToIngestPipeline(file: string, copyAction: FieldCopyAction) {
  const config: Papa.ParseConfig = {
    header: true,
    skipEmptyLines: true
  };
  const parseOutput = Papa.parse(file, config);
  const { data, errors, meta } = parseOutput;

  if (errors.length > 0) {
    console.log(errors)
    return null;
    // todo better error handling
  }

  let includesCheck = (arr: string[], target: string[]) => target.every(v => arr.includes(v));
  if (!includesCheck(meta['fields'], REQUIRED_CSV_HEADERS)) {
    // todo better error handling missing required headers
    return null;
  }

  const mapping = convertCsvToMapping(data, copyAction);
  if (mapping === null) {
    return null;
    // todo determine error handling here
  }

  return generatePipeline(mapping);
}

function convertCsvToMapping(rows: any[], copyAction: FieldCopyAction) {
  const mapping = new Map;
  for (const row of rows) {
    // Skip rows that don't have a source field
    if ( !row['source_field'] || !row['source_field'].trim() ) continue;
    // Skip if no destination field and no format field provided since it's possible to reformat a source field by itself
    if (( !row['destination_field'] || !row['destination_field'].trim() ) &&
    ( !row['format_field'] || !row['format_field'].trim() )) continue;
    
    const source_field = row['source_field'].trim();
    let destination_field = row['destination_field'] && row['destination_field'].trim() || undefined;
    const copy_action = row['copy_action'] && row['copy_action'].trim() || copyAction;
    let format_action = row['format_action'] && row['format_action'].trim();
    let timestamp_format = row['timestamp_format'] && row['timestamp_format'].trim();

    // If @timestamp is the destination and the user does not specify how to format the conversion, convert it to UNIX_MS
    if (row['destination_field'] === '@timestamp' && ( !row['timestamp_format'] || !row['timestamp_format'].trim() )) {
      format_action = 'parse_timestamp';
      timestamp_format = 'UNIX_MS';
    } 
    // If the destination field is empty but a format action is provided, then assume we're formating the source field.
    else if (!destination_field && format_action) {
      destination_field = source_field;
    }

    if (!ACCEPTED_FORMAT_ACTIONS.includes(format_action)) {
      // todo
      // raise "Unsupported format_action: #{row[:format_action]}, expected one of #{ACCEPTED_FORMAT_ACTIONS}"
    }

    mapping.set(
      source_field + '+' + destination_field,
      {
        source_field:       source_field,
        destination_field:  destination_field,
        copy_action:        copy_action,
        format_action:      format_action,
        timestamp_format:   timestamp_format,
      } as Mapping
    );
  }

  return mapping;
}

function generatePipeline(mapping: Map<string, Mapping>) {
  let pipeline = [];
  for (let [, row] of mapping) {
    if (hasSameName(row) && !row.format_action) continue;

    const source_field = row.source_field;
    
    // Copy/Rename
    if (row.destination_field && `parse_timestamp` !== row.format_action) {
      let processor = {};
      if ('copy' === row.copy_action) {
        processor = {
          set: {
            field: row.destination_field,
            value: '{{' + source_field + '}}',
            if: fieldPresencePredicate(source_field)
          }
        };
      }
      else {
        processor = {
          rename: {
            field: source_field,
            target_field: row.destination_field,
            ignore_missing: true
          }
        };
      }
      pipeline.push(processor);
    }

    if (row.format_action) {
      // Modify the source_field if there's no destination_field (no rename, just a type change)
      const affectedField = row.destination_field || row.source_field;

      let type = '';
      if ('to_boolean' == row.format_action)
        type = 'boolean';
      else if ('to_integer' == row.format_action)
        type = 'long';
      else if ('to_string' == row.format_action)
        type = 'string';
      else if ('to_float' == row.format_action)
        type = 'float';

      let processor = {};

      if (type) {
        processor = {
          convert: {
            field: affectedField,
            type: type,
            ignore_missing: true,
            ignore_failure: true,
          }
        };
      }
      else if ('uppercase' == row.format_action|| 'lowercase' == row.format_action) {
        processor = {
          [row.format_action] : {
            field: affectedField,
            ignore_missing: true,
            ignore_failure: true,
          }
        };
      }
      else if ('to_array' == row.format_action) {
        processor = {
          'append': {
            field: affectedField,
            value: [],
            ignore_failure: true,
            if: fieldPresencePredicate(affectedField),
          }
        };
      }
      else if ('parse_timestamp' == row.format_action) {
        processor = {
          'date': {
            field: row.source_field,
            target_field: row.destination_field,
            formats: [ row.timestamp_format ],
            timezone: "UTC",
            ignore_failure: true
          }
        };
      }
      pipeline.push(processor);
    }
  }
  return pipeline;
}

function fieldPresencePredicate (field: string) {
  if ('@timestamp' === field) {
    return "ctx.containsKey('@timestamp')";
  }
  
  let fieldLevels = field.split(".");
  if (fieldLevels.length == 1) {
    return `ctx.${field} != null`;
  }

  const nullSafe = fieldLevels.slice(0, -1).map(f => `${f}?`).join('.');
  return `ctx.${nullSafe}.${fieldLevels.slice(-1)[0]} != null`;
}

function hasSameName(row: Mapping) {
  return !row.destination_field || row.source_field == row.destination_field;
}
