/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicensingPluginSetup } from '../../../licensing/server';
import { CallAsCurrentUser } from '../types';

export async function canStartTrial(callAsCurrentUser: CallAsCurrentUser) {
  const options = {
    method: 'GET',
    path: '/_license/trial_status',
  };
  try {
    const response = await callAsCurrentUser('transport.request', options);
    return response.eligible_to_start_trial;
  } catch (error) {
    return error.body;
  }
}

interface StartTrialArg {
  callAsCurrentUser: CallAsCurrentUser;
  licensing: LicensingPluginSetup;
}

export async function startTrial({ callAsCurrentUser, licensing }: StartTrialArg) {
  const options = {
    method: 'POST',
    path: '/_license/start_trial?acknowledge=true',
  };
  try {
    const response = await callAsCurrentUser('transport.request', options);
    const { trial_was_started: trialWasStarted } = response;

    if (trialWasStarted) {
      await licensing.refresh();
    }

    return response;
  } catch (error) {
    return error.body;
  }
}
