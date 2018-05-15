/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import beatsIndexTemplate from './beats_template';
import { callWithInternalUserFactory } from '../client';

const TEMPLATE_NAME = 'beats-template';

export function installIndexTemplate(server) {
  const callWithInternalUser = callWithInternalUserFactory(server);
  return callWithInternalUser('indices.putTemplate', {
    name: TEMPLATE_NAME,
    body: beatsIndexTemplate
  });
}
