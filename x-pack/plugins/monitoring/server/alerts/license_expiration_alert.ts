/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { IUiSettingsClient } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertLicense,
  AlertLicenseState,
} from './types';
import { AlertInstance, AlertExecutorOptions } from '../../../alerting/server';
import { INDEX_PATTERN_ELASTICSEARCH, ALERT_LICENSE_EXPIRATION } from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from './enums';
import { fetchLicenses } from '../lib/alerts/fetch_licenses';
import { fetchDefaultEmailAddress } from '../lib/alerts/fetch_default_email_address';

const RESOLVED_SUBJECT = i18n.translate(
  'xpack.monitoring.alerts.licenseExpiration.resolvedSubject',
  {
    defaultMessage: 'RESOLVED X-Pack Monitoring: License Expiration',
  }
);

const NEW_SUBJECT = i18n.translate('xpack.monitoring.alerts.licenseExpiration.newSubject', {
  defaultMessage: 'NEW X-Pack Monitoring: License Expiration',
});

const EXPIRES_DAYS = [60, 30, 14, 7];

export class LicenseExpirationAlert extends BaseAlert {
  protected type = ALERT_LICENSE_EXPIRATION;
  protected label = 'License expiration';

  protected dateFormat: string = '';
  protected emailAddress: string = '';

  protected async executor(options: AlertExecutorOptions): Promise<any> {
    await super.executor(options);

    const uiSettings = (await this.getUiSettingsService()).asScopedToClient(
      options.services.savedObjectsClient
    );
    this.dateFormat = await uiSettings.get<string>('dateFormat');
    this.emailAddress = await fetchDefaultEmailAddress(uiSettings);
  }

  protected async fetchData(
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let esIndexPattern = INDEX_PATTERN_ELASTICSEARCH;
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const licenses = await fetchLicenses(callCluster, clusters, esIndexPattern);
    return licenses.map(license => {
      const $expiry = moment.utc(license.expiryDateMS);
      let isExpired = false;
      let severity = AlertSeverity.Success;

      if (license.status !== 'active') {
        isExpired = true;
        severity = AlertSeverity.Danger;
      } else if (license.expiryDateMS) {
        for (let i = EXPIRES_DAYS.length - 1; i >= 0; i--) {
          if (license.type === 'trial' && i < 2) {
            break;
          }

          const $fromNow = moment.utc().add(EXPIRES_DAYS[i], 'days');
          if ($fromNow.isAfter($expiry)) {
            isExpired = true;
            severity = i > 1 ? AlertSeverity.Warning : AlertSeverity.Danger;
            break;
          }
        }
      }

      return {
        instanceKey: `${license.clusterUuid}`,
        clusterUuid: license.clusterUuid,
        shouldFire: isExpired,
        severity,
        meta: license,
      };
    });
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertLicenseState {
    const license = item.meta as AlertLicense;
    return {
      cluster,
      expiredCheckDateMS: license.expiryDateMS,
      ui: {
        isFiring: false,
        message: null,
        severity: AlertSeverity.Success,
        resolvedMS: 0,
        triggeredMS: 0,
        lastCheckedMS: 0,
      },
    };
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const license = item.meta as AlertLicense;
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.licenseExpiration.ui.resolvedMessage', {
          defaultMessage: `This cluster's license is active.`,
        }),
      };
    }
    return {
      text: i18n.translate('xpack.monitoring.alerts.licenseExpiration.ui.firingMessage', {
        defaultMessage: `This cluster's license is going to expire in #relative at #absolute. #start_linkPlease update your license.#end_link`,
      }),
      tokens: [
        {
          startToken: '#relative',
          type: AlertMessageTokenType.Time,
          isRelative: true,
          isAbsolute: false,
          timestamp: license.expiryDateMS,
        } as AlertMessageTimeToken,
        {
          startToken: '#absolute',
          type: AlertMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp: license.expiryDateMS,
        } as AlertMessageTimeToken,
        {
          startToken: '#start_link',
          endToken: '#end_link',
          type: AlertMessageTokenType.Link,
          url: 'license',
        } as AlertMessageLinkToken,
      ],
    };
  }

  protected async executeActions(
    instance: AlertInstance,
    alertState: AlertState,
    item: AlertData,
    cluster: AlertCluster
  ) {
    const license = item.meta as AlertLicense;
    const $expiry = moment.utc(license.expiryDateMS);
    if (!alertState.ui.isFiring) {
      instance.scheduleActions('default', {
        subject: RESOLVED_SUBJECT,
        log_message: `This cluster alert has been resolved: Cluster '${
          cluster.clusterName
        }' license was going to expire on ${$expiry.format(this.dateFormat)}.`,
        to: this.emailAddress,
      });
    } else {
      instance.scheduleActions('default', {
        subject: NEW_SUBJECT,
        log_message: `Cluster '${
          cluster.clusterName
        }' license is going to expire on ${$expiry.format(
          this.dateFormat
        )}. Please update your license.`,
        to: this.emailAddress,
      });
    }
  }
}
