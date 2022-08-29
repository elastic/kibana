/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigurationEntry, EncryptedConfigurationEntry } from '../types/connectors';

export function isEncryptedConfigurationEntry(
  entry: ConfigurationEntry
): entry is EncryptedConfigurationEntry {
  return !!(entry as EncryptedConfigurationEntry).encrypted;
}
