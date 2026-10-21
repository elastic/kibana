/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { renderMetadataFieldValue } from './render_metadata_value';

const createDataView = (
  fields: Record<string, { convertToReact: (value: unknown) => string }>
): DataView =>
  ({
    getFieldByName: (name: string) => (fields[name] ? { name } : undefined),
    getFormatterForField: (field: { name: string }) => fields[field.name],
  } as unknown as DataView);

describe('renderMetadataFieldValue', () => {
  it('uses the data view formatter when the field is mapped', () => {
    const dataView = createDataView({
      '@timestamp': { convertToReact: (value) => `date:${String(value)}` },
    });

    expect(renderMetadataFieldValue(dataView, '@timestamp', '2024-06-15T14:30:45.123Z')).toBe(
      'date:2024-06-15T14:30:45.123Z'
    );
  });

  it('returns unmapped strings as-is so 4-digit keywords are not parsed as dates', () => {
    expect(renderMetadataFieldValue(undefined, 'labels.labelA', '0050')).toBe('0050');
    expect(renderMetadataFieldValue(undefined, 'host.name', null)).toBeUndefined();
  });
});
