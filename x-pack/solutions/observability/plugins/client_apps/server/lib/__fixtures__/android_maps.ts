/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';

export interface AndroidMapFixture {
  name: string;
  expected: string;
  stacktrace: string;
  classMaps: Array<{
    content: string;
    fileName: string;
  }>;
}

const DATA_DIR = path.resolve(__dirname, 'android_retrace_data');

const scenarios = [
  { name: '01-simple.txt', documents: ['l8.txt'] },
  { name: '02-multiline-range.txt', documents: ['p.txt', 'l8.txt'] },
  {
    name: '03-inline-chain.txt',
    documents: ['co_elastic_otel_android_integration_MainActivity.txt'],
  },
  { name: '04-separate-ranges.txt', documents: ['l8.txt'] },
  {
    name: '05-cross-class-inline.txt',
    documents: ['co_elastic_otel_android_integration_MainActivity.txt'],
  },
  { name: '06-no-range-entry.txt', documents: ['vv.txt'] },
  { name: '07-catch-all-range.txt', documents: ['s1.txt'] },
  { name: '08-chained-exception.txt', documents: ['l8.txt'] },
  {
    name: '09-activity-not-obfuscated.txt',
    documents: ['l8.txt', 'i8.txt', 'co_elastic_otel_android_integration_CrashActivity.txt'],
  },
  { name: '10-synthesized.txt', documents: ['l8.txt', 'i8.txt'] },
  { name: '11-outline.txt', documents: ['s2.txt', 's3.txt'] },
  { name: '12-rewrite-frame.txt', documents: ['y1.txt'] },
  { name: '13-real-crash.txt', documents: ['l8.txt', 'i8.txt'] },
  { name: '14-obfuscated-exception-class.txt', documents: ['s4.txt'] },
  { name: '15-suppressed-exception.txt', documents: ['s4.txt'] },
  { name: '16-inline-in-outline.txt', documents: ['s7.txt', 's8.txt'] },
  { name: '17-line-outside-range.txt', documents: ['s5.txt', 's6.txt'] },
  { name: '18-indented-real-crash.txt', documents: ['l8.txt', 'i8.txt'] },
];

export const androidMapFixtures: AndroidMapFixture[] = scenarios.map(({ name, documents }) => ({
  name,
  classMaps: documents.map((fileName) => ({
    content: fs.readFileSync(path.resolve(DATA_DIR, 'es-documents', fileName)).toString(),
    fileName,
  })),
  expected: fs.readFileSync(path.resolve(DATA_DIR, 'expected-output', name)).toString().trimEnd(),
  stacktrace: fs.readFileSync(path.resolve(DATA_DIR, 'stacktraces', name)).toString().trimEnd(),
}));
