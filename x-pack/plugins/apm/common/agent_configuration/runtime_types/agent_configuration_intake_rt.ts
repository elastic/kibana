/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { settingDefinitions } from '../setting_definitions';
import { SettingValidation } from '../setting_definitions/types';

// retrieve validation from config definitions settings and validate on the server
const knownSettings = settingDefinitions.reduce<
  Record<string, SettingValidation>
>((acc, { key, validation }) => {
  acc[key] = validation;
  return acc;
}, {});

export const serviceRt = t.partial({
  name: t.string,
  environment: t.string,
});

export const settingsRt = t.intersection([
  t.record(t.string, t.string),
  t.partial(knownSettings),
]);

export const agentConfigurationIntakeRt = t.intersection([
  t.partial({ agent_name: t.string }),
  t.type({
    service: serviceRt,
    settings: settingsRt,
  }),
]);
