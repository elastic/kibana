/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import edotJavaDashboard from './otel_native-edot-java.json';
import otelOtherJavaDashboard from './otel_native-otel_other-java.json';

// These JVM memory metrics can be mapped as `double` (e.g. when produced by Micrometer) in some indices
// and as `long` in others. Without an explicit cast ES|QL rejects the query with a verification_exception.
const FIELDS_REQUIRING_LONG_CAST = ['jvm.memory.limit', 'jvm.memory.used', 'jvm.memory.committed'];

describe('Java OTel-native dashboards', () => {
  describe.each([
    ['otel_native-edot-java', edotJavaDashboard],
    ['otel_native-otel_other-java', otelOtherJavaDashboard],
  ])('%s', (_name, dashboard) => {
    const serialized = JSON.stringify(dashboard);

    describe.each(FIELDS_REQUIRING_LONG_CAST)('%s', (field) => {
      it('is referenced', () => {
        expect(serialized).toContain(field);
      });

      it('is always cast to long', () => {
        // `(?!\w)` keeps longer field names that start with the same prefix (such as
        // `jvm.memory.used_after_last_gc`) from being reported as an uncast `jvm.memory.used`.
        const uncastReference = new RegExp(`${field.replace(/\./g, '\\.')}(?!\\w|::long)`, 'g');

        expect(serialized.match(uncastReference)).toBeNull();
      });
    });
  });
});
