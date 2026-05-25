/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from './evaluate';

// TODO: revert before merge — temporary hook to test suite_owner_notify.sh
evaluate('intentional failure for Slack notify testing', async () => {
  throw new Error('Intentional failure for Slack notify testing');
});
