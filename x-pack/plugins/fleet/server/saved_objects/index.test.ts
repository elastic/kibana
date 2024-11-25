/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedObjectTypes } from '.';

describe('space aware models', () => {
  it('should have the same mappings for space and non-space aware agent policies', () => {
    const soTypes = getSavedObjectTypes();

    expect(Object.keys(soTypes['ingest-agent-policies'].mappings).sort()).toEqual(
      Object.keys(soTypes['fleet-agent-policies'].mappings).sort()
    );
  });
  it('should have the same mappings for space and non-space aware package policies', () => {
    const soTypes = getSavedObjectTypes();

    expect(Object.keys(soTypes['ingest-package-policies'].mappings).sort()).toEqual(
      Object.keys(soTypes['fleet-package-policies'].mappings).sort()
    );
  });
});
