/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import { IBasePath } from '@kbn/core-http-server';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { AlertsLocatorParams, getAlertUrl } from '@kbn/observability-plugin/common';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { i18n } from '@kbn/i18n';
import { TLSLatestPing } from './tls_rule_executor';
import { ALERT_DETAILS_URL } from '../action_variables';
import { Cert } from '../../../common/runtime_types';
import { tlsTranslations } from '../translations';
interface TLSContent {
  summary: string;
  status?: string;
}

const getValidBefore = (notBefore?: string): TLSContent => {
  if (!notBefore) return { summary: 'Error, missing `certificate_not_valid_before` date.' };
  const relativeDate = moment().diff(notBefore, 'days');
  const formattedDate = moment(notBefore).format('MMM D, YYYY z');
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
const getValidAfter = (notAfter?: string): TLSContent => {
  if (!notAfter) return { summary: 'Error, missing `certificate_not_valid_after` date.' };
  const relativeDate = moment().diff(notAfter, 'days');
  const formattedDate = moment(notAfter).format('MMM D, YYYY z');
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

export const getCertSummary = (cert: Cert, expirationThreshold: number, ageThreshold: number) => {
  const isExpiring = new Date(cert.not_after ?? '').valueOf() < expirationThreshold;
  const isAging = new Date(cert.not_before ?? '').valueOf() < ageThreshold;
  let content: TLSContent | null = null;

  if (isExpiring) {
    content = getValidAfter(cert.not_after);
  } else if (isAging) {
    content = getValidBefore(cert.not_before);
  }

  const { summary = '', status = '' } = content || {};
  return {
    summary,
    status,
    sha256: cert.sha256 ?? '',
    commonName: cert.common_name ?? '',
    issuer: cert.issuer ?? '',
    monitorName: cert.monitorName,
    monitorType: cert.monitorType,
    locationName: cert.locationName,
    monitorUrl: cert.monitorUrl,
    configId: cert.configId,
  };
};

type CertSummary = ReturnType<typeof getCertSummary>;

export const setTLSRecoveredAlertsContext = async ({
  alertFactory,
  basePath,
  defaultStartedAt,
  getAlertStartedDate,
  spaceId,
  alertsLocator,
  getAlertUuid,
  latestPings,
}: {
  alertFactory: RuleExecutorServices['alertFactory'];
  defaultStartedAt: string;
  getAlertStartedDate: (alertInstanceId: string) => string | null;
  basePath: IBasePath;
  spaceId: string;
  alertsLocator?: LocatorPublic<AlertsLocatorParams>;
  getAlertUuid?: (alertId: string) => string | null;
  latestPings: TLSLatestPing[];
}) => {
  const { getRecoveredAlerts } = alertFactory.done();

  for await (const alert of getRecoveredAlerts()) {
    const recoveredAlertId = alert.getId();
    const alertUuid = getAlertUuid?.(recoveredAlertId) || null;
    const indexedStartedAt = getAlertStartedDate(recoveredAlertId) ?? defaultStartedAt;

    const state = alert.getState() as CertSummary;
    const alertUrl = await getAlertUrl(
      alertUuid,
      spaceId,
      indexedStartedAt,
      alertsLocator,
      basePath.publicBaseUrl
    );

    const configId = state.configId;
    const latestPing = latestPings.find((ping) => ping.config_id === configId);

    const previousStatus = i18n.translate('xpack.synthetics.alerts.tls.previousStatus', {
      defaultMessage: 'Certificate {commonName} {summary}',
      values: { commonName: state.commonName, summary: state.summary },
    });

    const newCommonName = latestPing?.tls?.server?.x509?.subject.common_name ?? '';
    const newExpiryDate = latestPing?.tls?.server?.x509?.not_after ?? '';

    const { summary } = getValidAfter(newExpiryDate);

    let newStatus = i18n.translate('xpack.synthetics.alerts.tls.newStatus', {
      defaultMessage: 'Certificate {commonName} {summary}',
      values: { commonName: newCommonName, summary },
    });

    let newSummary = '';
    if (state.sha256 !== latestPing?.tls?.server?.hash?.sha256) {
      newSummary = i18n.translate('xpack.synthetics.alerts.tls.newSummary', {
        defaultMessage: 'Monitor certificate has been updated.',
      });
    }
    if (state.sha256 === latestPing?.tls?.server?.hash?.sha256 || !latestPing) {
      // in this case it seems like threshold has been changed, but the cert is the same
      newSummary = i18n.translate('xpack.synthetics.alerts.tls.newSummaryThreshold', {
        defaultMessage: 'Expiry/Age threshold has been updated.',
      });
      newStatus = previousStatus;
    }

    alert.setContext({
      ...state,
      newStatus,
      previousStatus,
      summary: newSummary,
      [ALERT_DETAILS_URL]: alertUrl,
    });
  }
};
