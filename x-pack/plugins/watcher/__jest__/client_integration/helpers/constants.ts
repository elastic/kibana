/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getWatch } from '../../../test/fixtures';

export const WATCH_ID = 'my-test-watch';

export const WATCH = { watch: getWatch({ id: WATCH_ID }) };
