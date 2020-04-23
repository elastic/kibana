/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UptimeAlertTypeFactory } from './types';
import { savedObjectsAdapter } from '../saved_objects';
import { updateState } from './common';
import {
  ACTION_GROUP_DEFINITIONS,
  DYNAMIC_SETTINGS_DEFAULTS,
} from '../../../../../legacy/plugins/uptime/common/constants';
import { Cert } from '../../../../../legacy/plugins/uptime/common/runtime_types';

const { TLS } = ACTION_GROUP_DEFINITIONS;

const DEFAULT_FROM = 'now-7d';
const DEFAULT_TO = 'now';
const DEFAULT_INDEX = 0;
const DEFAULT_SIZE = 20;

const sortCerts = (a: string, b: string) => new Date(a).valueOf() - new Date(b).valueOf();

export const getCertSummary = (
  certs: Cert[],
  expirationThreshold: number,
  ageThreshold: number,
  maxSummaryItems: number = 1000,
  topLength: number = 3
) => {
  certs.sort((a, b) =>
    sortCerts(a.certificate_not_valid_after ?? '', b.certificate_not_valid_after ?? '')
  );
  const expiring = certs.filter(
    cert => new Date(cert.certificate_not_valid_after ?? '').valueOf() < expirationThreshold
  );
  certs.sort((a, b) =>
    sortCerts(a.certificate_not_valid_before ?? '', b.certificate_not_valid_before ?? '')
  );
  const aging = certs.filter(
    cert => new Date(cert.certificate_not_valid_before ?? '').valueOf() < ageThreshold
  );
  return {
    expiring: expiring.slice(0, maxSummaryItems),
    topExpiring: expiring.slice(0, topLength).map(cert => ({
      commonName: cert.common_name,
      validUntil: cert.certificate_not_valid_after,
    })),
    aging: aging.slice(0, maxSummaryItems),
    topAging: aging.slice(0, topLength).map(cert => ({
      commonName: cert.common_name,
      validAfter: cert.certificate_not_valid_before,
    })),
  };
};

export const tlsAlertFactory: UptimeAlertTypeFactory = (server, libs) => ({
  id: 'xpack.uptime.alerts.tls',
  name: i18n.translate('xpack/uptime.alerts.tls', {
    defaultMessage: 'Uptime TLS',
  }),
  validate: {
    params: schema.object({}),
  },
  defaultActionGroupId: TLS.id,
  actionGroups: [
    {
      id: TLS.id,
      name: TLS.name,
    },
  ],
  actionVariables: {
    context: [],
    state: [
      {
        name: 'count',
        description: i18n.translate('xpack.uptime.alerts.tls.actionVariables.state.count', {
          defaultMessage: 'The number of certs detected by the alert executor',
        }),
      },
      {
        name: 'expiringCount',
        description: i18n.translate('xpack.uptime.alerts.tls.actionVariables.state.expiringCount', {
          defaultMessage: 'The number of expiring certs detected by the alert.',
        }),
      },
      {
        name: 'expiringCommonNameAndDate',
        description: i18n.translate(
          'xpack.uptime.alerts.tls.actionVariables.state.expiringCommonNameAndDate',
          {
            defaultMessage: 'The common names and expiration date/time of the detected certs',
          }
        ),
      },
      {
        name: 'agingCount',
        description: i18n.translate('xpack.uptime.alerts.tls.actionVariables.state.agingCount', {
          defaultMessage: 'The number of detected certs that are becoming too old.',
        }),
      },

      {
        name: 'agingCommonNameAndDate',
        description: i18n.translate(
          'xpack.uptime.alerts.tls.actionVariables.state.agingCommonNameAndDate',
          {
            defaultMessage: 'The common names and expiration date/time of the detected certs.',
          }
        ),
      },
    ],
  },
  async executor(options) {
    const {
      services: { alertInstanceFactory, callCluster, savedObjectsClient },
      state,
    } = options;
    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);

    const certs = await libs.requests.getCerts({
      callES: callCluster,
      dynamicSettings,
      from: DEFAULT_FROM,
      to: DEFAULT_TO,
      index: DEFAULT_INDEX,
      size: DEFAULT_SIZE,
      notValidAfter: `now+${dynamicSettings.certThresholds?.expiration ??
        DYNAMIC_SETTINGS_DEFAULTS.certThresholds?.expiration}d`,
      notValidBefore: `now-${dynamicSettings.certThresholds?.age ??
        DYNAMIC_SETTINGS_DEFAULTS.certThresholds?.age}d`,
    });

    if (certs.length) {
      const absoluteExpirationThreshold = moment()
        .add(
          dynamicSettings.certThresholds?.expiration ??
            DYNAMIC_SETTINGS_DEFAULTS.certThresholds?.expiration,
          'd'
        )
        .valueOf();
      const absoluteAgeThreshold = moment()
        .subtract(
          dynamicSettings.certThresholds?.age ?? DYNAMIC_SETTINGS_DEFAULTS.certThresholds?.age,
          'd'
        )
        .valueOf();
      const alertInstance = alertInstanceFactory(TLS.id);
      alertInstance.replaceState({
        ...getCertSummary(certs, absoluteExpirationThreshold, absoluteAgeThreshold),
      });
      alertInstance.scheduleActions(TLS.id);
    }

    return updateState(state, certs.length > 0);
  },
});
