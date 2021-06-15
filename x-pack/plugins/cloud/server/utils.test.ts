/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDeploymentIdFromDeploymentUrl } from './utils';

describe('parseDeploymentIdFromDeploymentUrl', () => {
  it('should return undefined if there is no deploymentUrl configured', () => {
    expect(parseDeploymentIdFromDeploymentUrl()).toBeUndefined();
  });

  it('should return the deploymentId if this is a valid deployment url', () => {
    expect(parseDeploymentIdFromDeploymentUrl('deployments/uuid-deployment-1')).toBe(
      'uuid-deployment-1'
    );
  });
});
