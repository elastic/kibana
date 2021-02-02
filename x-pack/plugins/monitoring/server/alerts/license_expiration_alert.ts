/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  LegacyAlert,
} from '../../common/types/alerts';
import { AlertExecutorOptions, AlertInstance } from '../../../alerts/server';
import { ALERT_LICENSE_EXPIRATION, LEGACY_ALERT_DETAILS } from '../../common/constants';
import { AlertMessageTokenType } from '../../common/enums';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerts/common';
import { Globals } from '../static_globals';

export class LicenseExpirationAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_LICENSE_EXPIRATION,
      name: LEGACY_ALERT_DETAILS[ALERT_LICENSE_EXPIRATION].label,
      legacy: {
        watchName: 'xpack_license_expiration',
        nodeNameLabel: i18n.translate('xpack.monitoring.alerts.licenseExpiration.nodeNameLabel', {
          defaultMessage: 'Elasticsearch cluster alert',
        }),
      },
      interval: '1d',
      actionVariables: [
        {
          name: 'expiredDate',
          description: i18n.translate(
            'xpack.monitoring.alerts.licenseExpiration.actionVariables.expiredDate',
            {
              defaultMessage: 'The date when the license expires.',
            }
          ),
        },
        {
          name: 'clusterName',
          description: i18n.translate(
            'xpack.monitoring.alerts.licenseExpiration.actionVariables.clusterName',
            {
              defaultMessage: 'The cluster to which the license belong.',
            }
          ),
        },
        AlertingDefaults.ALERT_TYPE.context.internalShortMessage,
        AlertingDefaults.ALERT_TYPE.context.internalFullMessage,
        AlertingDefaults.ALERT_TYPE.context.state,
        AlertingDefaults.ALERT_TYPE.context.action,
        AlertingDefaults.ALERT_TYPE.context.actionPlain,
      ],
    });
  }

  protected async execute(options: AlertExecutorOptions): Promise<any> {
    if (!Globals.app.config.ui.show_license_expiration) {
      return;
    }
    return await super.execute(options);
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const legacyAlert = item.meta as LegacyAlert;
    return {
      text: i18n.translate('xpack.monitoring.alerts.licenseExpiration.ui.firingMessage', {
        defaultMessage: `The license for this cluster expires in #relative at #absolute. #start_linkPlease update your license.#end_link`,
      }),
      tokens: [
        {
          startToken: '#relative',
          type: AlertMessageTokenType.Time,
          isRelative: true,
          isAbsolute: false,
          timestamp: legacyAlert.metadata.time,
        } as AlertMessageTimeToken,
        {
          startToken: '#absolute',
          type: AlertMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp: legacyAlert.metadata.time,
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
    const legacyAlert = item.meta as LegacyAlert;
    const $expiry = moment(legacyAlert.metadata.time);
    const $duration = moment.duration(+new Date() - $expiry.valueOf());
    if (alertState.ui.isFiring) {
      const actionText = i18n.translate('xpack.monitoring.alerts.licenseExpiration.action', {
        defaultMessage: 'Please update your license.',
      });
      const action = `[${actionText}](elasticsearch/nodes)`;
      const expiredDate = $duration.humanize();
      instance.scheduleActions('default', {
        internalShortMessage: i18n.translate(
          'xpack.monitoring.alerts.licenseExpiration.firing.internalShortMessage',
          {
            defaultMessage: `License expiration alert is firing for {clusterName}. Your license expires in {expiredDate}. {actionText}`,
            values: {
              clusterName: cluster.clusterName,
              expiredDate,
              actionText,
            },
          }
        ),
        internalFullMessage: i18n.translate(
          'xpack.monitoring.alerts.licenseExpiration.firing.internalFullMessage',
          {
            defaultMessage: `License expiration alert is firing for {clusterName}. Your license expires in {expiredDate}. {action}`,
            values: {
              clusterName: cluster.clusterName,
              expiredDate,
              action,
            },
          }
        ),
        state: AlertingDefaults.ALERT_STATE.firing,
        expiredDate,
        clusterName: cluster.clusterName,
        action,
        actionPlain: actionText,
      });
    }
  }
}
