/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { settingDefinitions } from './config_setting_definitions';

export const serviceRt = t.partial({
  name: t.string,
  environment: t.string
});

// retrieve validation from config definitions settings and validate on the server
const knownSettings = settingDefinitions.reduce<
  Record<string, t.Type<any, any, unknown>>
>((acc, { key, validation }) => {
  acc[key] = validation;
  return acc;
}, {});

export const agentConfigurationIntakeRt = t.intersection([
  t.partial({ agent_name: t.string }),
  t.type({
    service: serviceRt,
    settings: t.intersection([
      t.record(t.string, t.string),
      t.partial(knownSettings)
    ])
  })
]);
