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

const DEFAULT_FROM = 'now-1d';
const DEFAULT_TO = 'now';
const DEFAULT_INDEX = 0;
const DEFAULT_SIZE = 1000;

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
    context: [
      // TODO
    ],
    state: [
      // TODO
    ],
  },
  async executor(options) {
    const {
      params: { from, to, index, size, search },
      services: { alertInstanceFactory, callCluster, savedObjectsClient },
      state,
    } = options;
    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);

    const certs = await libs.requests.getCerts({
      callES: callCluster,
      dynamicSettings,
      from: from || DEFAULT_FROM,
      to: to || DEFAULT_TO,
      index: index || DEFAULT_INDEX,
      size: size || DEFAULT_SIZE,
      search,
      notValidAfter: `now+${dynamicSettings.certificatesThresholds?.expiration ??
        DYNAMIC_SETTINGS_DEFAULTS.certificatesThresholds?.expiration}d`,
      notValidBefore: `now-${dynamicSettings.certificatesThresholds?.age ??
        DYNAMIC_SETTINGS_DEFAULTS.certificatesThresholds?.age}d`,
    });

    if (certs.length) {
      const absoluteExpirationThreshold = moment()
        .add(
          dynamicSettings.certificatesThresholds?.expiration ??
            DYNAMIC_SETTINGS_DEFAULTS.certificatesThresholds?.expiration,
          'd'
        )
        .valueOf();
      const absoluteAgeThreshold = moment()
        .subtract(
          dynamicSettings.certificatesThresholds?.age ??
            DYNAMIC_SETTINGS_DEFAULTS.certificatesThresholds?.age,
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
