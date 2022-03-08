/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { UptimeAlertTypeFactory } from './types';
import { updateState } from './common';
import { TLS_LEGACY } from '../../../common/constants/alerts';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';
import { Cert, CertResult } from '../../../common/runtime_types';
import { commonStateTranslations, tlsTranslations } from './translations';
import { ActionGroupIdsOf } from '../../../../alerting/common';

import { AlertInstanceContext } from '../../../../alerting/common';
import { Alert } from '../../../../alerting/server';

import { savedObjectsAdapter } from '../saved_objects/saved_objects';
import { createUptimeESClient } from '../lib';
import {
  DEFAULT_FROM,
  DEFAULT_SIZE,
  DEFAULT_TO,
} from '../../../common/requests/get_certs_request_body';

export type ActionGroupIds = ActionGroupIdsOf<typeof TLS_LEGACY>;

type TLSAlertInstance = Alert<Record<string, any>, AlertInstanceContext, ActionGroupIds>;

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

export const tlsLegacyAlertFactory: UptimeAlertTypeFactory<ActionGroupIds> = (_server, libs) => ({
  id: 'xpack.uptime.alerts.tls',
  producer: 'uptime',
  name: tlsTranslations.legacyAlertFactoryName,
  validate: {
    params: schema.object({}),
  },
  defaultActionGroupId: TLS_LEGACY.id,
  actionGroups: [
    {
      id: TLS_LEGACY.id,
      name: TLS_LEGACY.name,
    },
  ],
  actionVariables: {
    context: [],
    state: [...tlsTranslations.actionVariables, ...commonStateTranslations],
  },
  isExportable: true,
  minimumLicenseRequired: 'basic',
  async executor({ services: { alertFactory, scopedClusterClient, savedObjectsClient }, state }) {
    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);

    const uptimeEsClient = createUptimeESClient({
      esClient: scopedClusterClient.asCurrentUser,
      savedObjectsClient,
    });
    const { certs, total }: CertResult = await libs.requests.getCerts({
      uptimeEsClient,
      from: DEFAULT_FROM,
      to: DEFAULT_TO,
      pageIndex: 0,
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
      const alertInstance: TLSAlertInstance = alertFactory.create(TLS_LEGACY.id);
      const summary = getCertSummary(certs, absoluteExpirationThreshold, absoluteAgeThreshold);
      alertInstance.replaceState({
        ...updateState(state, foundCerts),
        ...summary,
      });
      alertInstance.scheduleActions(TLS_LEGACY.id);
    }

    return updateState(state, foundCerts);
  },
});
