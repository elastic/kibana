/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LicensingPluginSetup } from '../../../licensing/server';
import { CallAsCurrentUser } from '../types';

const getStartBasicPath = (acknowledge: boolean) =>
  `/_license/start_basic${acknowledge ? '?acknowledge=true' : ''}`;

interface StartBasicArg {
  acknowledge: boolean;
  callAsCurrentUser: CallAsCurrentUser;
  licensing: LicensingPluginSetup;
}

export async function startBasic({ acknowledge, callAsCurrentUser, licensing }: StartBasicArg) {
  const options = {
    method: 'POST',
    path: getStartBasicPath(acknowledge),
  };
  try {
    const response = await callAsCurrentUser('transport.request', options);
    const { basic_was_started: basicWasStarted } = response;
    if (basicWasStarted) {
      await licensing.refresh();
    }
    return response;
  } catch (error) {
    return error.body;
  }
}
