/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import { XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING } from '../../../../../server/lib/constants';
import { KIBANA_SETTINGS_TYPE } from '../../../common/constants';

/*
 * Check if Cluster Alert email notifications is enabled in config
 * If so, use uiSettings API to fetch the X-Pack default admin email
 */
export async function getDefaultAdminEmail(config, callWithInternalUser) {
  if (!config.get('xpack.monitoring.cluster_alerts.email_notifications.enabled')) {
    return null;
  }

  const index = config.get('kibana.index');
  const version = config.get('pkg.version');
  const uiSettingsDoc = await callWithInternalUser('get', {
    index,
    type: 'doc',
    id: `config:${version}`,
    ignore: [ 400, 404 ] // 400 if the index is closed, 404 if it does not exist
  });

  return get(uiSettingsDoc, ['_source', 'config', XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING], null);
}

// we use shouldUseNull to determine if we need to send nulls; we only send nulls if the last email wasn't null
let shouldUseNull = true;

export async function checkForEmailValue(
  config,
  callWithInternalUser,
  _shouldUseNull = shouldUseNull,
  _getDefaultAdminEmail = getDefaultAdminEmail
) {
  const defaultAdminEmail = await _getDefaultAdminEmail(config, callWithInternalUser);

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

export function getSettingsCollector(server) {
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const config = server.config();

  let _log;
  const setLogger = logger => {
    _log = logger;
  };

  const fetch = async () => {
    let kibanaSettingsData;
    const defaultAdminEmail = await checkForEmailValue(config, callWithInternalUser);

    // skip everything if defaultAdminEmail === undefined
    if (defaultAdminEmail || (defaultAdminEmail === null && shouldUseNull)) {
      kibanaSettingsData = {
        xpack: {
          default_admin_email: defaultAdminEmail
        }
      };
      _log.debug(`[${defaultAdminEmail}] default admin email setting found, sending [${KIBANA_SETTINGS_TYPE}] monitoring document.`);
    } else {
      _log.debug(`not sending [${KIBANA_SETTINGS_TYPE}] monitoring document because [${defaultAdminEmail}] is null or invalid.`);
    }

    // remember the current email so that we can mark it as successful if the bulk does not error out
    shouldUseNull = !!defaultAdminEmail;

    return kibanaSettingsData;
  };

  return {
    type: KIBANA_SETTINGS_TYPE,
    setLogger,
    fetch
  };
}
