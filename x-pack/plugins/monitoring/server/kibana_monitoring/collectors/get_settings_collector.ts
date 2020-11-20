/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { Collector, UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import {
  KIBANA_SETTINGS_TYPE,
  XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING,
  CLUSTER_ALERTS_ADDRESS_CONFIG_KEY,
} from '../../../common/constants';
import { MonitoringConfig } from '../../config';
import { CoreServices } from '../../core_services';

let loggedDeprecationWarning = false;
/*
 * Check if Cluster Alert email notifications is enabled in config
 * If so, use uiSettings API to fetch the X-Pack default admin email
 */
export async function getDefaultAdminEmail(config: MonitoringConfig, log?: Logger) {
  const {
    email_notifications: { enabled, email_address: emailAddress },
  } = config.cluster_alerts;

  if (enabled && emailAddress?.length) {
    return emailAddress;
  }

  const defaultAdminEmail = await CoreServices.getUISetting(XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING);

  if (defaultAdminEmail && !loggedDeprecationWarning && log) {
    const emailAddressConfigKey = `monitoring.${CLUSTER_ALERTS_ADDRESS_CONFIG_KEY}`;
    loggedDeprecationWarning = true;
    const message =
      `Monitoring is using "${XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING}" for cluster alert notifications, ` +
      `which will not be supported in Kibana 8.0. Please configure ${emailAddressConfigKey} in your kibana.yml settings`;
    log.warn(message);
  }

  return defaultAdminEmail;
}

// we use shouldUseNull to determine if we need to send nulls; we only send nulls if the last email wasn't null
let shouldUseNull = true;

export async function checkForEmailValue(
  config: MonitoringConfig,
  _shouldUseNull = shouldUseNull,
  _getDefaultAdminEmail = getDefaultAdminEmail,
  log?: Logger
) {
  const defaultAdminEmail = await _getDefaultAdminEmail(config, log);

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

export interface KibanaSettingsCollectorExtraOptions {
  getEmailValueStructure(email: string | null): EmailSettingData;
}

export type KibanaSettingsCollector = Collector<EmailSettingData | undefined> &
  KibanaSettingsCollectorExtraOptions;

export function getEmailValueStructure(email: string | null) {
  return {
    xpack: {
      default_admin_email: email,
    },
  };
}

export async function getKibanaSettings(logger: Logger, config: MonitoringConfig) {
  let kibanaSettingsData;
  const defaultAdminEmail = await checkForEmailValue(config);

  // skip everything if defaultAdminEmail === undefined
  if (defaultAdminEmail || (defaultAdminEmail === null && shouldUseNull)) {
    kibanaSettingsData = getEmailValueStructure(defaultAdminEmail);
    logger.debug(
      `[${defaultAdminEmail}] default admin email setting found, sending [${KIBANA_SETTINGS_TYPE}] monitoring document.`
    );
  } else {
    logger.debug(
      `not sending [${KIBANA_SETTINGS_TYPE}] monitoring document because [${defaultAdminEmail}] is null or invalid.`
    );
  }

  // remember the current email so that we can mark it as successful if the bulk does not error out
  shouldUseNull = !!defaultAdminEmail;

  // returns undefined if there was no result
  return kibanaSettingsData;
}

export function getSettingsCollector(
  usageCollection: UsageCollectionSetup,
  config: MonitoringConfig
) {
  return usageCollection.makeStatsCollector<
    EmailSettingData | undefined,
    unknown,
    false,
    KibanaSettingsCollectorExtraOptions
  >({
    type: KIBANA_SETTINGS_TYPE,
    isReady: () => true,
    schema: {
      xpack: {
        default_admin_email: { type: 'text' },
      },
    },
    async fetch() {
      return getKibanaSettings(this.log, config);
    },
    getEmailValueStructure(email: string | null) {
      return getEmailValueStructure(email);
    },
  });
}
