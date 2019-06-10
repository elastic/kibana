/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { encryptedSavedObjects } from './index';
import { getConfigSchema } from '../../test_utils';

const describeWithContext = describe.each([[{ dist: false }], [{ dist: true }]]);

describeWithContext('config schema with context %j', context => {
  it('produces correct config', async () => {
    const schema = await getConfigSchema(encryptedSavedObjects);
    await expect(schema.validate({}, { context })).resolves.toMatchSnapshot();
  });
});
