/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMaxVersion } from './get_max_version';

describe('Fleet - getMaxVersion', () => {
  it('returns the maximum version', () => {
    const versions = ['8.1.0', '8.3.0', '8.2.1', '7.16.0', '8.2.0', '7.16.1', '8.3.1'];
    expect(getMaxVersion(versions)).toEqual('8.3.1');
  });

  it('returns the maximum version when there are duplicates', () => {
    const versions = ['8.1.0', '8.3.0', '8.2.1', '7.16.0', '8.2.0', '7.16.1', '8.2.0', '7.15.1'];
    expect(getMaxVersion(versions)).toEqual('8.3.0');
  });

  it('returns the maximum version when there is a snapshot version', () => {
    const versions = ['8.1.0', '8.2.0-SNAPSHOT', '7.16.0', '7.16.1'];
    expect(getMaxVersion(versions)).toEqual('8.2.0-SNAPSHOT');
  });

  it('returns the maximum version and prefers the major version to the snapshot', () => {
    const versions = ['8.1.0', '8.2.0-SNAPSHOT', '8.2.0', '7.16.0', '7.16.1'];
    expect(getMaxVersion(versions)).toEqual('8.2.0');
  });

  it('when there is only a version returns it', () => {
    const versions = ['8.1.0'];
    expect(getMaxVersion(versions)).toEqual('8.1.0');
  });

  it('returns an empty string when the passed array is empty', () => {
    const versions: string[] = [];
    expect(getMaxVersion(versions)).toEqual('');
  });
});
