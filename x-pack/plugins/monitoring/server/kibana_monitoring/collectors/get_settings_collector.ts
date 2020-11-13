/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Collector, UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import { KIBANA_SETTINGS_TYPE } from '../../../common/constants';
import { MonitoringConfig } from '../../config';

/*
 * Check if Cluster Alert email notifications is enabled in config
 * If so, get email from kibana.yml
 */
export async function getDefaultAdminEmail(config: MonitoringConfig) {
  return config.cluster_alerts.email_notifications.email_address || null;
}

// we use shouldUseNull to determine if we need to send nulls; we only send nulls if the last email wasn't null
let shouldUseNull = true;

export async function checkForEmailValue(
  config: MonitoringConfig,
  _shouldUseNull = shouldUseNull,
  _getDefaultAdminEmail = getDefaultAdminEmail
) {
  const defaultAdminEmail = await _getDefaultAdminEmail(config);

  // Allow null so clearing the advanced setting will be reflected in the data
  const isAcceptableNull = defaultAdminEmail === null && _shouldUseNull;

  /* NOTE we have no real validation checking here. If the user enters a bad
   * string for email, their email server will alert the admin the fact what
   * went wrong and they'll have to track it back to cluster alerts email
   * notifications on their own. */

  if (isAcceptableNull || defaultAdminEmail !== null) {
    return defaultAdminEmail;
  }
}

interface EmailSettingData {
  xpack: { default_admin_email: string | null };
}

export interface KibanaSettingsCollector extends Collector<EmailSettingData | undefined> {
  getEmailValueStructure(email: string | null): EmailSettingData;
}

export function getSettingsCollector(
  usageCollection: UsageCollectionSetup,
  config: MonitoringConfig
) {
  return usageCollection.makeStatsCollector({
    type: KIBANA_SETTINGS_TYPE,
    isReady: () => true,
    schema: {
      xpack: {
        default_admin_email: { type: 'text' },
      },
    },
    async fetch(this: KibanaSettingsCollector) {
      let kibanaSettingsData;
      const defaultAdminEmail = await checkForEmailValue(config);

      // skip everything if defaultAdminEmail === undefined
      if (defaultAdminEmail || (defaultAdminEmail === null && shouldUseNull)) {
        kibanaSettingsData = this.getEmailValueStructure(defaultAdminEmail);
        this.log.debug(
          `[${defaultAdminEmail}] default admin email setting found, sending [${KIBANA_SETTINGS_TYPE}] monitoring document.`
        );
      } else {
        this.log.debug(
          `not sending [${KIBANA_SETTINGS_TYPE}] monitoring document because [${defaultAdminEmail}] is null or invalid.`
        );
      }

      // remember the current email so that we can mark it as successful if the bulk does not error out
      shouldUseNull = !!defaultAdminEmail;

      // returns undefined if there was no result
      return kibanaSettingsData;
    },
    getEmailValueStructure(email: string | null) {
      return {
        xpack: {
          default_admin_email: email,
        },
      };
    },
  });
}
