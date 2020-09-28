/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateAgentVersion } from './enroll';

describe('validateAgentVersion', () => {
  it('should throw with agent > kibana version', () => {
    expect(() => validateAgentVersion('8.8.0', '8.0.0')).toThrowError('not compatible');
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

  it('very close versions, e.g. patch/prerelease - all combos should work', () => {
    validateAgentVersion('7.9.1', '7.9.2');
    validateAgentVersion('7.8.1', '7.8.2');
    validateAgentVersion('7.6.99', '7.6.2');
    validateAgentVersion('7.6.2', '7.6.99');
    validateAgentVersion('5.94.3', '5.94.1234-SNAPSHOT');
    validateAgentVersion('5.94.3-SNAPSHOT', '5.94.1');
  });

  it('somewhat close versions, minor release is 1 or 2 versions back and is older than the stack', () => {
    validateAgentVersion('7.9.1', '7.10.2');
    validateAgentVersion('7.9.9', '7.11.1');
    validateAgentVersion('7.6.99', '7.6.2');
    validateAgentVersion('7.6.2', '7.6.99');
    expect(() => validateAgentVersion('5.94.3-SNAPSHOT', '5.93.1')).toThrowError('not compatible');
    expect(() => validateAgentVersion('5.94.3', '5.92.99-SNAPSHOT')).toThrowError('not compatible');
  });

  it('versions where Agent is a minor version or major version greater (newer) than the stack should not work', () => {
    expect(() => validateAgentVersion('7.10.1', '7.9.99')).toThrowError('not compatible');
    expect(() => validateAgentVersion('7.9.9', '6.11.1')).toThrowError('not compatible');
    expect(() => validateAgentVersion('5.94.3', '5.92.99-SNAPSHOT')).toThrowError('not compatible');
  });
});
