/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'src/core/server';
import { LicensingPluginStart } from '../../../licensing/server';

interface StartBasicArg {
  acknowledge: boolean;
  client: IScopedClusterClient;
  licensing: LicensingPluginStart;
}

export async function startBasic({ acknowledge, client, licensing }: StartBasicArg) {
  try {
    const response = await client.asCurrentUser.license.postStartBasic({ acknowledge });
    const { basic_was_started: basicWasStarted } = response;
    if (basicWasStarted) {
      await licensing.refresh();
    }
    return response;
  } catch (error) {
    return error.body;
  }
}
