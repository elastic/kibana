/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactNode } from 'react';
import { JsonValue } from '../../common/typed_json';

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
