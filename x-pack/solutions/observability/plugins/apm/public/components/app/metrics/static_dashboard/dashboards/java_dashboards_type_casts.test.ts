/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import edotJavaDashboard from './otel_native-edot-java.json';
import otelOtherJavaDashboard from './otel_native-otel_other-java.json';

// jvm.memory.limit can be mapped as `double` (e.g. when produced by Micrometer) in some indices and
// as `long` in others. Without an explicit cast ES|QL rejects the query with a verification_exception.
describe('Java OTel-native dashboards', () => {
  describe.each([
    ['otel_native-edot-java', edotJavaDashboard],
    ['otel_native-otel_other-java', otelOtherJavaDashboard],
  ])('%s', (_name, dashboard) => {
    const serialized = JSON.stringify(dashboard);

    it('references jvm.memory.limit', () => {
      expect(serialized).toContain('jvm.memory.limit');
    });

    it('casts every jvm.memory.limit reference to long', () => {
      expect(serialized.match(/jvm\.memory\.limit(?!::long)/g)).toBeNull();
    });
  });
});
