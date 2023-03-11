/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { NOTIFICATION_THROTTLE_NO_ACTIONS } from '../../../../../../common/constants';
import type { RuleAlertType } from '../../../rule_schema';

/**
 * Mutes, unmutes, or does nothing to the alert if no changed is detected
 * @param id The id of the alert to (un)mute
 * @param rulesClient the rules client
 * @param muteAll If the existing alert has all actions muted
 * @param throttle If the existing alert has a throttle set
 */
export const maybeMute = async ({
  id,
  rulesClient,
  muteAll,
  throttle,
}: {
  id: RuleAlertType['id'];
  rulesClient: RulesClient;
  muteAll: RuleAlertType['muteAll'];
  throttle: string | null | undefined;
}): Promise<void> => {
  if (muteAll && throttle !== NOTIFICATION_THROTTLE_NO_ACTIONS) {
    await rulesClient.unmuteAll({ id });
  } else if (!muteAll && throttle === NOTIFICATION_THROTTLE_NO_ACTIONS) {
    await rulesClient.muteAll({ id });
  } else {
    // Do nothing, no-operation
  }
};
