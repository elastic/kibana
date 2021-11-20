/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { JsonValue } from '@kbn/utility-types';

/**
 * Interface for common configuration properties, regardless of the column type.
 */
interface CommonRenderConfiguration {
  id: string;
  width?: number | string;
  header?: boolean | string;
}

interface TimestampColumnRenderConfiguration {
  timestampColumn: CommonRenderConfiguration & {
    render?: (timestamp: number) => ReactNode;
  };
}

interface MessageColumnRenderConfiguration {
  messageColumn: CommonRenderConfiguration & {
    render?: (message: string) => ReactNode;
  };
}

interface FieldColumnRenderConfiguration {
  fieldColumn: CommonRenderConfiguration & {
    field: string;
    render?: (value: JsonValue) => ReactNode;
  };
}

export type LogColumnRenderConfiguration =
  | TimestampColumnRenderConfiguration
  | MessageColumnRenderConfiguration
  | FieldColumnRenderConfiguration;

export function isTimestampColumnRenderConfiguration(
  column: LogColumnRenderConfiguration
): column is TimestampColumnRenderConfiguration {
  return 'timestampColumn' in column;
}

export function isMessageColumnRenderConfiguration(
  column: LogColumnRenderConfiguration
): column is MessageColumnRenderConfiguration {
  return 'messageColumn' in column;
}

export function isFieldColumnRenderConfiguration(
  column: LogColumnRenderConfiguration
): column is FieldColumnRenderConfiguration {
  return 'fieldColumn' in column;
}

export function columnWidthToCSS(width: number | string) {
  return typeof width === 'number' ? `${width}px` : width;
}
