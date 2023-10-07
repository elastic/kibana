/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getComponentTemplateName, getIndexTemplateAndPattern } from './resource_installer_utils';

describe('getComponentTemplateName', () => {
  test('should use default when name and context are undefined', () => {
    expect(getComponentTemplateName()).toEqual(`.alerts-framework-mappings`);
  });

  test('should use name as is when name is defined', () => {
    expect(getComponentTemplateName({ name: 'test-my-mappings' })).toEqual(
      `.alerts-test-my-mappings-mappings`
    );
  });

  test('should use append .alerts to context when context is defined', () => {
    expect(getComponentTemplateName({ context: 'test-my-mappings' })).toEqual(
      `.alerts-test-my-mappings.alerts-mappings`
    );
  });

  test('should prioritize context when context and name are both defined', () => {
    expect(
      getComponentTemplateName({ context: 'test-my-mappings', name: 'dont-name-me-this' })
    ).toEqual(`.alerts-test-my-mappings.alerts-mappings`);
  });
});

describe('getIndexTemplateAndPattern', () => {
  test('should use default namespace when namespace is undefined', () => {
    expect(getIndexTemplateAndPattern({ context: 'test' })).toEqual({
      template: '.alerts-test.alerts-default-index-template',
      pattern: '.internal.alerts-test.alerts-default-*',
      basePattern: '.alerts-test.alerts-*',
      alias: '.alerts-test.alerts-default',
      validPrefixes: ['.ds-.alerts-', '.internal.alerts-', '.alerts-'],
      name: '.internal.alerts-test.alerts-default-000001',
    });
  });

  test('should use namespace when namespace is defined', () => {
    expect(getIndexTemplateAndPattern({ context: 'test', namespace: 'special' })).toEqual({
      template: '.alerts-test.alerts-special-index-template',
      pattern: '.internal.alerts-test.alerts-special-*',
      basePattern: '.alerts-test.alerts-*',
      alias: '.alerts-test.alerts-special',
      validPrefixes: ['.ds-.alerts-', '.internal.alerts-', '.alerts-'],
      name: '.internal.alerts-test.alerts-special-000001',
    });
  });

  test('should return secondaryAlias when secondaryAlias is defined', () => {
    expect(
      getIndexTemplateAndPattern({
        context: 'test',
        namespace: 'special',
        secondaryAlias: 'siem.signals',
      })
    ).toEqual({
      template: '.alerts-test.alerts-special-index-template',
      pattern: '.internal.alerts-test.alerts-special-*',
      basePattern: '.alerts-test.alerts-*',
      alias: '.alerts-test.alerts-special',
      name: '.internal.alerts-test.alerts-special-000001',
      validPrefixes: ['.ds-.alerts-', '.internal.alerts-', '.alerts-'],
      secondaryAlias: `siem.signals-special`,
    });
  });
});
