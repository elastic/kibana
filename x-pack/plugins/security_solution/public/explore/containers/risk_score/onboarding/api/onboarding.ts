/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, NotificationsStart } from '@kbn/core/public';

import { INTERNAL_RISK_SCORE_URL } from '../../../../../../common/constants';

import { RiskScoreEntity } from '../../../../../../common/search_strategy';
import {
  HOST_RISK_SCORES_ENABLED_TITLE,
  INSTALLATION_ERROR,
  RISK_SCORES_ENABLED_TEXT,
  USER_RISK_SCORES_ENABLED_TITLE,
} from './translations';

interface Options {
  riskScoreEntity: RiskScoreEntity;
}

type Response = Record<string, { success?: boolean; error?: Error }>;
const toastLifeTimeMs = 600000;

export const installRiskScore = ({
  errorMessage,
  http,
  notifications,
  options,
  renderDocLink,
  signal,
}: {
  errorMessage?: string;
  http: HttpSetup;
  notifications?: NotificationsStart;
  options: Options;
  renderDocLink?: (message: string) => React.ReactNode;
  signal?: AbortSignal;
}) => {
  return http
    .post<Response[]>(INTERNAL_RISK_SCORE_URL, {
      body: JSON.stringify(options),
      signal,
    })
    .then((result) => {
      const resp = result.reduce(
        (acc, curr) => {
          const [[key, res]] = Object.entries(curr);
          if (res.success) {
            return res.success != null ? { ...acc, success: [...acc.success, `${key}`] } : acc;
          } else {
            return res.error != null
              ? { ...acc, error: [...acc.error, `${key}: ${res?.error?.message}`] }
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
          'data-test-subj': `${options.riskScoreEntity}EnableSuccessToast`,
          title:
            options.riskScoreEntity === RiskScoreEntity.user
              ? USER_RISK_SCORES_ENABLED_TITLE
              : HOST_RISK_SCORES_ENABLED_TITLE,
          text: RISK_SCORES_ENABLED_TEXT(resp.success.join(', ')),
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
};
