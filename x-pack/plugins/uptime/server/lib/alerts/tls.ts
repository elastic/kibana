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
import { TLS } from '../../../common/constants/alerts';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';
import { Cert, CertResult } from '../../../common/runtime_types';
import { commonStateTranslations, tlsTranslations } from './translations';
import { DEFAULT_FROM, DEFAULT_TO } from '../../rest_api/certs/certs';
import { uptimeAlertWrapper } from './uptime_alert_wrapper';
import { ActionGroupIdsOf } from '../../../../alerting/common';

export type ActionGroupIds = ActionGroupIdsOf<typeof TLS>;

const DEFAULT_SIZE = 20;

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

export const tlsAlertFactory: UptimeAlertTypeFactory<ActionGroupIds> = (_server, libs) =>
  uptimeAlertWrapper<ActionGroupIds>({
    id: 'xpack.uptime.alerts.tlsCertificate',
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
    isExportable: true,
    async executor({ options, dynamicSettings, uptimeEsClient }) {
      const {
        services: { alertInstanceFactory },
        state,
      } = options;

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
          const alertInstance = alertInstanceFactory(
            `${cert.common_name}-${cert.issuer?.replace(/\s/g, '_')}-${cert.sha256}`
          );
          const summary = getCertSummary(cert, absoluteExpirationThreshold, absoluteAgeThreshold);
          alertInstance.replaceState({
            ...updateState(state, foundCerts),
            ...summary,
          });
          alertInstance.scheduleActions(TLS.id);
        });
      }

      return updateState(state, foundCerts);
    },
  });
