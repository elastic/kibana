/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HttpSetup,
  NotificationsStart,
  SavedObject,
  SavedObjectAttributes,
  ThemeServiceStart,
} from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { RISKY_HOSTS_DASHBOARD_TITLE, RISKY_USERS_DASHBOARD_TITLE } from '../../../constants';
import {
  prebuiltSavedObjectsBulkCreateUrl,
  prebuiltSavedObjectsBulkDeleteUrl,
} from '../../../../../common/constants';

import { RiskScoreEntity } from '../../../../../common/search_strategy';

import {
  DELETE_SAVED_OBJECTS_FAILURE,
  IMPORT_SAVED_OBJECTS_FAILURE,
  IMPORT_SAVED_OBJECTS_SUCCESS,
} from './translations';

const toastLifeTimeMs = 600000;

interface Options {
  templateName: string;
}

export const bulkCreatePrebuiltSavedObjects = async ({
  dashboard,
  to,
  errorMessage,
  http,
  notifications,
  options,
  renderDashboardLink,
  renderDocLink,
  from,
  theme,
}: {
  dashboard?: DashboardStart;
  to: string;
  errorMessage?: string;
  http: HttpSetup;
  notifications?: NotificationsStart;
  options: Options;
  renderDashboardLink?: (message: string, dashboardUrl: string) => React.ReactNode;
  renderDocLink?: (message: string) => React.ReactNode;
  from: string;
  theme?: ThemeServiceStart;
}) => {
  const res = await http
    .post<{ saved_objects: Array<SavedObject<SavedObjectAttributes>> }>(
      prebuiltSavedObjectsBulkCreateUrl(options.templateName)
    )
    .then((result) => {
      const errors = result.saved_objects.reduce<string[]>((acc, o) => {
        return o.error != null ? [...acc, `${o.id}: ${o.error.message}`] : acc;
      }, []);

      if (errors.length > 0) {
        notifications?.toasts?.addError(new Error(errorMessage ?? IMPORT_SAVED_OBJECTS_FAILURE), {
          title: errorMessage ?? IMPORT_SAVED_OBJECTS_FAILURE,
          toastMessage: renderDocLink
            ? (renderDocLink(errors.join(', ')) as unknown as string)
            : errors.join(', '),
          toastLifeTimeMs,
        });
      } else {
        const dashboardTitle =
          options.templateName === `${RiskScoreEntity.user}RiskScoreDashboards`
            ? RISKY_USERS_DASHBOARD_TITLE
            : RISKY_HOSTS_DASHBOARD_TITLE;

        const targetDashboard = result.saved_objects.find(
          (obj) => obj.type === 'dashboard' && obj?.attributes?.title === dashboardTitle
        );

        let targetUrl;
        if (targetDashboard?.id) {
          targetUrl = dashboard?.locator?.getRedirectUrl({
            dashboardId: targetDashboard?.id,
            timeRange: {
              to,
              from,
            },
          });
        }

        const successMessage = result.saved_objects
          .map((o) => o?.attributes?.title ?? o?.attributes?.name)
          .join(', ');

        notifications?.toasts?.addSuccess({
          title: IMPORT_SAVED_OBJECTS_SUCCESS(result.saved_objects.length),
          text: toMountPoint(
            renderDashboardLink && targetUrl
              ? renderDashboardLink(successMessage, targetUrl)
              : successMessage,
            {
              theme$: theme?.theme$,
            }
          ),
        });
      }
    })
    .catch((e) => {
      notifications?.toasts?.addError(new Error(errorMessage ?? IMPORT_SAVED_OBJECTS_FAILURE), {
        title: errorMessage ?? IMPORT_SAVED_OBJECTS_FAILURE,
        toastMessage: renderDocLink ? renderDocLink(e?.body?.message) : e?.body?.message,
        toastLifeTimeMs,
      });
    });

  return res;
};

export const bulkDeletePrebuiltSavedObjects = async ({
  http,
  notifications,
  errorMessage,
  options,
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  errorMessage?: string;
  options: Options;
}) => {
  const res = await http
    .post(prebuiltSavedObjectsBulkDeleteUrl(options.templateName))
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? DELETE_SAVED_OBJECTS_FAILURE,
        text: e?.body?.message,
      });
    });

  return res;
};
