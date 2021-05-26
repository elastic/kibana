/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { UptimeAlertTypeFactory } from './types';
import { updateState, generateAlertMessage } from './common';
import { TLS } from '../../../common/constants/alerts';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';
import { Cert, CertResult } from '../../../common/runtime_types';
import { commonStateTranslations, tlsTranslations } from './translations';
import { DEFAULT_FROM, DEFAULT_TO } from '../../rest_api/certs/certs';
import { TlsTranslations } from '../../../common/translations';

export const DEFAULT_SIZE = 20;

interface TlsAlertState {
  count: number;
  agingCount: number;
  agingCommonNameAndDate: string;
  expiringCount: number;
  expiringCommonNameAndDate: string;
  hasAging: true | null;
  hasExpired: true | null;
}

const sortCerts = (a: string, b: string) => new Date(a).valueOf() - new Date(b).valueOf();

const mapCertsToSummaryString = (
  certs: Cert[],
  certLimitMessage: (cert: Cert) => string,
  maxSummaryItems: number
): string =>
  certs
    .slice(0, maxSummaryItems)
    .map((cert) => `${cert.common_name}, ${certLimitMessage(cert)}`)
    .reduce((prev, cur) => (prev === '' ? cur : prev.concat(`; ${cur}`)), '');

const getValidAfter = ({ not_after: date }: Cert) => {
  if (!date) return 'Error, missing `certificate_not_valid_after` date.';
  const relativeDate = moment().diff(date, 'days');
  return relativeDate >= 0
    ? tlsTranslations.validAfterExpiredString(date, relativeDate)
    : tlsTranslations.validAfterExpiringString(date, Math.abs(relativeDate));
};

const getValidBefore = ({ not_before: date }: Cert): string => {
  if (!date) return 'Error, missing `certificate_not_valid_before` date.';
  const relativeDate = moment().diff(date, 'days');
  return relativeDate >= 0
    ? tlsTranslations.validBeforeExpiredString(date, relativeDate)
    : tlsTranslations.validBeforeExpiringString(date, Math.abs(relativeDate));
};

export const getCertSummary = (
  certs: Cert[],
  expirationThreshold: number,
  ageThreshold: number,
  maxSummaryItems: number = 3
): TlsAlertState => {
  certs.sort((a, b) => sortCerts(a.not_after ?? '', b.not_after ?? ''));
  const expiring = certs.filter(
    (cert) => new Date(cert.not_after ?? '').valueOf() < expirationThreshold
  );

  certs.sort((a, b) => sortCerts(a.not_before ?? '', b.not_before ?? ''));
  const aging = certs.filter((cert) => new Date(cert.not_before ?? '').valueOf() < ageThreshold);

  return {
    count: certs.length,
    agingCount: aging.length,
    agingCommonNameAndDate: mapCertsToSummaryString(aging, getValidBefore, maxSummaryItems),
    expiringCommonNameAndDate: mapCertsToSummaryString(expiring, getValidAfter, maxSummaryItems),
    expiringCount: expiring.length,
    hasAging: aging.length > 0 ? true : null,
    hasExpired: expiring.length > 0 ? true : null,
  };
};

export const tlsAlertFactory: UptimeAlertTypeFactory = (_server, libs) => ({
  id: 'xpack.uptime.alerts.tls',
  name: tlsTranslations.alertFactoryName,
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
    state: [...tlsTranslations.actionVariables, ...commonStateTranslations],
  },
  minimumLicenseRequired: 'basic',
  async executor({ services: { alertWithLifecycle, uptimeEsClient, dynamicSettings }, state }) {
    const { certs, total }: CertResult = await libs.requests.getCerts({
      uptimeEsClient,
      from: DEFAULT_FROM,
      to: DEFAULT_TO,
      index: 0,
      size: DEFAULT_SIZE,
      notValidAfter: `now+${
        dynamicSettings?.certExpirationThreshold ??
        DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold
      }d`,
      notValidBefore: `now-${
        dynamicSettings?.certAgeThreshold ?? DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold
      }d`,
      sortBy: 'common_name',
      direction: 'desc',
    });

    const foundCerts = total > 0;

    if (foundCerts) {
      const absoluteExpirationThreshold = moment()
        .add(
          dynamicSettings.certExpirationThreshold ??
            DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold,
          'd'
        )
        .valueOf();
      const absoluteAgeThreshold = moment()
        .subtract(
          dynamicSettings.certAgeThreshold ?? DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold,
          'd'
        )
        .valueOf();
      const summary = getCertSummary(certs, absoluteExpirationThreshold, absoluteAgeThreshold);

      const alert = alertWithLifecycle({
        id: TLS.id,
        fields: {
          'cert.count': summary.count,
          'cert_status.aging_count': summary.agingCount,
          'cert_status.aging_common_name_and_date': summary.agingCommonNameAndDate,
          'cert_status.expiring_count': summary.expiringCount,
          'cert_status.expiring_common_name_and_date': summary.expiringCommonNameAndDate,
          'cert_status.has_aging': summary.hasAging,
          'cert_status.has_expired': summary.hasExpired,
          reason: generateAlertMessage(TlsTranslations.defaultActionMessage, summary),
        },
      });

      alert.replaceState({
        ...updateState(state, foundCerts),
        ...summary,
      });
      alert.scheduleActions(TLS.id);
    }

    return updateState(state, foundCerts);
  },
});
