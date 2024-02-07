/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEcsAllowedValue } from './event_utils';

describe('test isEcsAllowedValue', () => {
  it('should return if the value is an allowed value given by field name', () => {
    expect(isEcsAllowedValue('event.kind', 'event')).toBe(true);
    expect(isEcsAllowedValue('event.kind', 'not ecs')).toBe(false);
    expect(isEcsAllowedValue('event.category', 'not ecs')).toBe(false);
    expect(isEcsAllowedValue('not ecs field', 'file')).toBe(false);
  });
});
