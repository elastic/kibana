/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, NotificationsStart, ThemeServiceStart } from '@kbn/core/public';

import { INTERNAL_RISK_SCORE_URL } from '../../../../../common/constants';

import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import { INSTALLATION_ERROR } from './translations';

interface Options {
  riskScoreEntity: RiskScoreEntity;
}

type Response = Record<string, { success?: boolean; error?: Error }>;
const toastLifeTimeMs = 600000;

export const onboardingRiskScore = async ({
  errorMessage,
  http,
  notifications,
  options,
  renderDashboardLink,
  renderDocLink,
  signal,
  theme,
}: {
  errorMessage?: string;
  http: HttpSetup;
  notifications?: NotificationsStart;
  options: Options;
  renderDashboardLink?: (message: string, dashboardUrl: string) => React.ReactNode;
  renderDocLink?: (message: string) => React.ReactNode;
  signal?: AbortSignal;
  theme?: ThemeServiceStart;
}) => {
  const response = await http
    .post<Response[]>(INTERNAL_RISK_SCORE_URL, {
      body: JSON.stringify(options),
      signal,
    })
    .then((result) => {
      const resp = Object.entries(result).reduce(
        (acc, [key, res]) => {
          if (res.success) {
            return res.success != null ? { ...acc, success: [...acc.success, `${key}`] } : acc;
          } else {
            return res.error != null
              ? { ...acc, error: [...acc.error, `${key}: ${res?.error?.error?.message}`] }
              : acc;
          }
        },
        { success: [] as string[], error: [] as string[] }
      );

      if (resp.error.length > 0) {
        notifications?.toasts?.addError(new Error(errorMessage ?? INSTALLATION_ERROR), {
          title: errorMessage ?? INSTALLATION_ERROR,
          toastMessage: renderDocLink
            ? (renderDocLink(resp.error.join(', ')) as unknown as string)
            : resp.error.join(', '),
          toastLifeTimeMs,
        });
      } else {
        notifications?.toasts?.addSuccess({
          text: `${resp.success.join(', ')} installed`,
          toastLifeTimeMs,
        });
      }
    })
    .catch((e) => {
      notifications?.toasts?.addError(new Error(errorMessage ?? INSTALLATION_ERROR), {
        title: errorMessage ?? INSTALLATION_ERROR,
        toastMessage: renderDocLink ? renderDocLink(e?.body?.message) : e?.body?.message,
        toastLifeTimeMs,
      });
    });

  return response;
};
