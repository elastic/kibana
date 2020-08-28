/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateAgentVersion } from './enroll';

describe('validateAgentVersion', () => {
  it('should throw with agent > kibana version', () => {
    expect(() => validateAgentVersion('8.8.0', '8.0.0')).toThrowError(
      /Agent version is not compatible with kibana version/
    );
  });
  it('should work with agent < kibana version', () => {
    validateAgentVersion('7.8.0', '8.0.0');
  });

  it('should work with agent = kibana version', () => {
    validateAgentVersion('8.0.0', '8.0.0');
  });

  it('should work with SNAPSHOT version', () => {
    validateAgentVersion('8.0.0-SNAPSHOT', '8.0.0-SNAPSHOT');
  });

  it('should work with a agent using SNAPSHOT version', () => {
    validateAgentVersion('7.8.0-SNAPSHOT', '7.8.0');
  });

  it('should work with a kibana using SNAPSHOT version', () => {
    validateAgentVersion('7.8.0', '7.8.0-SNAPSHOT');
  });
});
