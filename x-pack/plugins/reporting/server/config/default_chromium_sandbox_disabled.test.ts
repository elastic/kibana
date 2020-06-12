/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('getos', () => {
  return jest.fn();
});

import { getDefaultChromiumSandboxDisabled } from './default_chromium_sandbox_disabled';
import getos from 'getos';

interface TestObject {
  os: string;
  dist?: string;
  release?: string;
}

function defaultTest(os: TestObject, expectedDefault: boolean) {
  test(`${expectedDefault ? 'disabled' : 'enabled'} on ${JSON.stringify(os)}`, async () => {
    (getos as jest.Mock).mockImplementation((cb) => cb(null, os));
    const actualDefault = await getDefaultChromiumSandboxDisabled();
    expect(actualDefault.disableSandbox).toBe(expectedDefault);
  });
}

defaultTest({ os: 'win32' }, false);
defaultTest({ os: 'darwin' }, false);
defaultTest({ os: 'linux', dist: 'Centos', release: '7.0' }, true);
defaultTest({ os: 'linux', dist: 'Red Hat Linux', release: '7.0' }, true);
defaultTest({ os: 'linux', dist: 'Ubuntu Linux', release: '14.04' }, false);
defaultTest({ os: 'linux', dist: 'Ubuntu Linux', release: '16.04' }, false);
defaultTest({ os: 'linux', dist: 'SUSE Linux', release: '11' }, false);
defaultTest({ os: 'linux', dist: 'SUSE Linux', release: '12' }, false);
defaultTest({ os: 'linux', dist: 'SUSE Linux', release: '42.0' }, false);
defaultTest({ os: 'linux', dist: 'Debian', release: '8' }, true);
defaultTest({ os: 'linux', dist: 'Debian', release: '9' }, true);
