/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

enum InfraFormatterType {
  number = 'number',
  abbreviatedNumber = 'abbreviatedNumber',
  bytes = 'bytes',
  bits = 'bits',
  percent = 'percent',
}

interface MetricFormatter {
  formatter: InfraFormatterType;
  template: string;
  bounds?: { min: number; max: number };
}

interface MetricFormatters {
  [key: string]: MetricFormatter;
}

export const METRIC_FORMATTERS: MetricFormatters = {
  ['count']: { formatter: InfraFormatterType.number, template: '{{value}}' },
  ['cpu']: {
    formatter: InfraFormatterType.percent,
    template: '{{value}}',
  },
  ['memory']: {
    formatter: InfraFormatterType.percent,
    template: '{{value}}',
  },
  ['rx']: { formatter: InfraFormatterType.bits, template: '{{value}}/s' },
  ['tx']: { formatter: InfraFormatterType.bits, template: '{{value}}/s' },
  ['logRate']: {
    formatter: InfraFormatterType.abbreviatedNumber,
    template: '{{value}}/s',
  },
  ['diskIOReadBytes']: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}/s',
  },
  ['diskIOWriteBytes']: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}/s',
  },
  ['s3BucketSize']: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}',
  },
  ['s3TotalRequests']: {
    formatter: InfraFormatterType.abbreviatedNumber,
    template: '{{value}}',
  },
  ['s3NumberOfObjects']: {
    formatter: InfraFormatterType.abbreviatedNumber,
    template: '{{value}}',
  },
  ['s3UploadBytes']: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}',
  },
  ['s3DownloadBytes']: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}',
  },
  ['sqsOldestMessage']: {
    formatter: InfraFormatterType.number,
    template: '{{value}} seconds',
  },
  ['rdsLatency']: {
    formatter: InfraFormatterType.number,
    template: '{{value}} ms',
  },
};
