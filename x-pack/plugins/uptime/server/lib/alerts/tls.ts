/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import { UptimeAlertTypeFactory } from './types';
import { updateState, generateAlertMessage } from './common';
import { TLS } from '../../../common/constants/alerts';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';
import { Cert, CertResult } from '../../../common/runtime_types';
import { commonStateTranslations, tlsTranslations } from './translations';
import { TlsTranslations } from '../../../common/translations';

import { savedObjectsAdapter } from '../saved_objects/saved_objects';
import { createUptimeESClient } from '../lib';

export type ActionGroupIds = ActionGroupIdsOf<typeof TLS>;

interface TlsAlertState {
  commonName: string;
  issuer: string;
  summary: string;
  status: string;
}

interface TLSContent {
  summary: string;
  status?: string;
}

const mapCertsToSummaryString = (
  cert: Cert,
  certLimitMessage: (cert: Cert) => TLSContent
): TLSContent => certLimitMessage(cert);

const getValidAfter = ({ not_after: date }: Cert): TLSContent => {
  if (!date) return { summary: 'Error, missing `certificate_not_valid_after` date.' };
  const relativeDate = moment().diff(date, 'days');
  const formattedDate = moment(date).format('MMM D, YYYY z');
  return relativeDate >= 0
    ? {
        summary: tlsTranslations.validAfterExpiredString(formattedDate, relativeDate),
        status: tlsTranslations.expiredLabel,
      }
    : {
        summary: tlsTranslations.validAfterExpiringString(formattedDate, Math.abs(relativeDate)),
        status: tlsTranslations.expiringLabel,
      };
};

const getValidBefore = ({ not_before: date }: Cert): TLSContent => {
  if (!date) return { summary: 'Error, missing `certificate_not_valid_before` date.' };
  const relativeDate = moment().diff(date, 'days');
  const formattedDate = moment(date).format('MMM D, YYYY z');
  return relativeDate >= 0
    ? {
        summary: tlsTranslations.validBeforeExpiredString(formattedDate, relativeDate),
        status: tlsTranslations.agingLabel,
      }
    : {
        summary: tlsTranslations.validBeforeExpiringString(formattedDate, Math.abs(relativeDate)),
        status: tlsTranslations.invalidLabel,
      };
};

export const getCertSummary = (
  cert: Cert,
  expirationThreshold: number,
  ageThreshold: number
): TlsAlertState => {
  const isExpiring = new Date(cert.not_after ?? '').valueOf() < expirationThreshold;
  const isAging = new Date(cert.not_before ?? '').valueOf() < ageThreshold;
  let content: TLSContent | null = null;

  if (isExpiring) {
    content = mapCertsToSummaryString(cert, getValidAfter);
  } else if (isAging) {
    content = mapCertsToSummaryString(cert, getValidBefore);
  }

  const { summary = '', status = '' } = content || {};

  return {
    commonName: cert.common_name ?? '',
    issuer: cert.issuer ?? '',
    summary,
    status,
  };
};

export const tlsAlertFactory: UptimeAlertTypeFactory<ActionGroupIds> = (_server, libs) => ({
  id: 'xpack.uptime.alerts.tlsCertificate',
  producer: 'uptime',
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
    context: [...tlsTranslations.actionVariables, ...commonStateTranslations],
    state: [...tlsTranslations.actionVariables, ...commonStateTranslations],
  },
  isExportable: true,
  minimumLicenseRequired: 'basic',
  async executor({
    services: { alertWithLifecycle, savedObjectsClient, scopedClusterClient },
    state,
  }) {
    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);

    const uptimeEsClient = createUptimeESClient({
      esClient: scopedClusterClient.asCurrentUser,
      savedObjectsClient,
    });

    const { certs, total }: CertResult = await libs.requests.getCerts({
      uptimeEsClient,
      pageIndex: 0,
      size: 1000,
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
      certs.forEach((cert) => {
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
        const summary = getCertSummary(cert, absoluteExpirationThreshold, absoluteAgeThreshold);

        const alertInstance = alertWithLifecycle({
          id: `${cert.common_name}-${cert.issuer?.replace(/\s/g, '_')}-${cert.sha256}`,
          fields: {
            'tls.server.x509.subject.common_name': cert.common_name,
            'tls.server.x509.issuer.common_name': cert.issuer,
            'tls.server.x509.not_after': cert.not_after,
            'tls.server.x509.not_before': cert.not_before,
            'tls.server.hash.sha256': cert.sha256,
            [ALERT_REASON]: generateAlertMessage(TlsTranslations.defaultActionMessage, summary),
          },
        });
        alertInstance.replaceState({
          ...updateState(state, foundCerts),
          ...summary,
        });
        alertInstance.scheduleActions(TLS.id, { ...summary });
      });
    }

    return updateState(state, foundCerts);
  },
});
