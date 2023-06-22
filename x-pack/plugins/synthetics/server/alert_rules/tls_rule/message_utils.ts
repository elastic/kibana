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
import { ALERT_DETAILS_URL } from '../action_variables';
import { Cert } from '../../../common/runtime_types';
import { tlsTranslations } from '../translations';
interface TLSContent {
  summary: string;
  status?: string;
}

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
const mapCertsToSummaryString = (
  cert: Cert,
  certLimitMessage: (cert: Cert) => TLSContent
): TLSContent => certLimitMessage(cert);
export const getCertSummary = (cert: Cert, expirationThreshold: number, ageThreshold: number) => {
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
    summary,
    status,
    commonName: cert.common_name ?? '',
    issuer: cert.issuer ?? '',
    monitorName: cert.monitorName,
    monitorType: cert.monitorType,
    locationName: cert.locationName,
    monitorUrl: cert.monitorUrl,
  };
};

export const setRecoveredAlertsContext = async ({
  alertFactory,
  basePath,
  defaultStartedAt,
  getAlertStartedDate,
  spaceId,
  alertsLocator,
  getAlertUuid,
}: {
  alertFactory: RuleExecutorServices['alertFactory'];
  defaultStartedAt: string;
  getAlertStartedDate: (alertInstanceId: string) => string | null;
  basePath: IBasePath;
  spaceId: string;
  alertsLocator?: LocatorPublic<AlertsLocatorParams>;
  getAlertUuid?: (alertId: string) => string | null;
}) => {
  const { getRecoveredAlerts } = alertFactory.done();

  for await (const alert of getRecoveredAlerts()) {
    const recoveredAlertId = alert.getId();
    const alertUuid = getAlertUuid?.(recoveredAlertId) || null;
    const indexedStartedAt = getAlertStartedDate(recoveredAlertId) ?? defaultStartedAt;

    const state = alert.getState();
    const alertUrl = await getAlertUrl(
      alertUuid,
      spaceId,
      indexedStartedAt,
      alertsLocator,
      basePath.publicBaseUrl
    );

    alert.setContext({
      ...state,
      [ALERT_DETAILS_URL]: alertUrl,
    });
  }
};
