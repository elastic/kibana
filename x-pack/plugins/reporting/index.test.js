/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reporting } from './index';
import { getConfigSchema } from '../../test_utils';

// The snapshot records the number of cpus available
// to make the snapshot deterministic `os.cpus` needs to be mocked
// but the other members on `os` must remain untouched
jest.mock(
  'os',
  () => {
    const os = jest.requireActual('os');
    os.cpus = () => [{}, {}, {}, {}];
    return os;
  }
);

const describeWithContext = describe.each([
  [{ dev: false, dist: false }],
  [{ dev: true, dist: false }],
  [{ dev: false, dist: true }],
  [{ dev: true, dist: true }],
]);

describeWithContext('config schema with context %j', (context) => {
  it('produces correct config', async () => {
    const schema = await getConfigSchema(reporting);
    const value = await schema.validate({}, { context });
    value.capture.browser.chromium.disableSandbox = '<platform dependent>';
    await expect(value).toMatchSnapshot();
  });
});
