/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUD_SERVICES } from './cloud_services';
import { AWS } from './aws';
import { AZURE } from './azure';
import { GCP } from './gcp';

describe('cloudServices', () => {
  const expectedOrder = [AWS, GCP, AZURE];

  it('iterates in expected order', () => {
    let i = 0;
    for (const service of CLOUD_SERVICES) {
      expect(service).toBe(expectedOrder[i++]);
    }
  });
});
