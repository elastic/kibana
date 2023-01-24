/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTimestampRuntimeMapping } from './build_timestamp_runtime_mapping';

describe('buildTimestampRuntimeMapping', () => {
  test('builds a correct timestamp fallback runtime mapping', () => {
    const runtimeMapping = buildTimestampRuntimeMapping({
      timestampOverride: 'event.ingested',
    });

    expect(runtimeMapping).toMatchSnapshot();
  });
});
