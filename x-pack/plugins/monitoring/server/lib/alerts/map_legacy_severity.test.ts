/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertSeverity } from '../../../common/enums';
import { mapLegacySeverity } from './map_legacy_severity';

describe('mapLegacySeverity', () => {
  it('should map it', () => {
    expect(mapLegacySeverity(500)).toBe(AlertSeverity.Warning);
    expect(mapLegacySeverity(1000)).toBe(AlertSeverity.Warning);
    expect(mapLegacySeverity(2000)).toBe(AlertSeverity.Danger);
  });
});
