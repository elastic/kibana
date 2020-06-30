/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { mlLog } from '../../client/log';

export function upgradeCheckProvider(callAsCurrentUser: LegacyAPICaller) {
  async function isUpgradeInProgress(): Promise<boolean> {
    let upgradeInProgress = false;
    try {
      const info = await callAsCurrentUser('ml.info');
      // if ml indices are currently being migrated, upgrade_mode will be set to true
      // pass this back with the privileges to allow for the disabling of UI controls.
      upgradeInProgress = info.upgrade_mode === true;
    } catch (error) {
      // if the ml.info check fails, it could be due to the user having insufficient privileges
      // most likely they do not have the ml_user role and therefore will be blocked from using
      // ML at all. However, we need to catch this error so the privilege check doesn't fail.
      if (error.status === 403) {
        mlLog.info(
          'Unable to determine whether upgrade is being performed due to insufficient user privileges'
        );
      } else {
        mlLog.warn('Unable to determine whether upgrade is being performed');
      }
    }
    return upgradeInProgress;
  }
  return { isUpgradeInProgress };
}
