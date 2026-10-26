/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { ReactNode } from 'react';

/**
 * Formats a metadata table value from the field's mapped type when available.
 */
export function renderMetadataFieldValue(
  dataView: DataView | undefined,
  fieldName: string,
  value: unknown
): ReactNode | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  const field = dataView?.getFieldByName(fieldName);
  if (dataView && field) {
    return dataView.getFormatterForField(field).convertToReact(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  return undefined;
}
