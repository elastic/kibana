/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../common/entities';
import { getEntityTypeLabel } from './get_entity_type_label';

describe('getEntityTypeLabel', () => {
  it('should return "Service" for the "service" entityType', () => {
    const label = getEntityTypeLabel('service');
    expect(label).toBe('Service');
  });

  it('should return "Container" for the "container" entityType', () => {
    const label = getEntityTypeLabel('container');
    expect(label).toBe('Container');
  });

  it('should return "Host" for the "host" entityType', () => {
    const label = getEntityTypeLabel('host');
    expect(label).toBe('Host');
  });

  it('should return "N/A" for an unknown entityType', () => {
    const label = getEntityTypeLabel('foo' as EntityType);
    expect(label).toBe('N/A');
  });
});
