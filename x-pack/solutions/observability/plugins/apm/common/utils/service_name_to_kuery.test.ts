/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { getServiceNameKuery } from './service_name_to_kuery';

describe('getServiceNameKuery', () => {
  it('quotes a plain service name', () => {
    expect(getServiceNameKuery('opbeans-java')).toBe('service.name: "opbeans-java"');
  });

  it('quotes a service name containing a colon', () => {
    expect(getServiceNameKuery('unknown_service:java')).toBe(
      'service.name: "unknown_service:java"'
    );
  });

  it('quotes a service name containing whitespace', () => {
    expect(getServiceNameKuery('my service')).toBe('service.name: "my service"');
  });

  it('quotes a service name containing KQL keywords', () => {
    expect(getServiceNameKuery('cats and dogs')).toBe('service.name: "cats and dogs"');
    expect(getServiceNameKuery('not found')).toBe('service.name: "not found"');
  });

  it('escapes double quotes', () => {
    expect(getServiceNameKuery('say "hi"')).toBe('service.name: "say \\"hi\\""');
  });

  it('escapes backslashes', () => {
    expect(getServiceNameKuery('back\\slash')).toBe('service.name: "back\\\\slash"');
  });

  describe('produces a parseable KQL expression', () => {
    const serviceNames = [
      'opbeans-java',
      'unknown_service:java',
      'my service',
      'cats and dogs',
      'not found',
      'say "hi"',
      'back\\slash',
      'wildcard*',
      'parens (v2)',
      'greater>than',
    ];

    it.each(serviceNames)('%s', (serviceName) => {
      expect(() => fromKueryExpression(getServiceNameKuery(serviceName))).not.toThrow();
    });
  });
});
