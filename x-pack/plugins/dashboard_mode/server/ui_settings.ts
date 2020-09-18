/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from 'kibana/server';
import { UI_SETTINGS } from '../common';

const DASHBOARD_ONLY_USER_ROLE = 'kibana_dashboard_only_user';

export function getUiSettings(): Record<string, UiSettingsParams<unknown>> {
  return {
    [UI_SETTINGS.CONFIG_DASHBOARD_ONLY_MODE_ROLES]: {
      name: i18n.translate('xpack.dashboardMode.uiSettings.dashboardsOnlyRolesTitle', {
        defaultMessage: 'Dashboards only roles',
      }),
      description: i18n.translate('xpack.dashboardMode.uiSettings.dashboardsOnlyRolesDescription', {
        defaultMessage: 'Roles that belong to View Dashboards Only mode',
      }),
      value: [DASHBOARD_ONLY_USER_ROLE],
      category: ['dashboard'],
      deprecation: {
        message: i18n.translate('xpack.dashboardMode.uiSettings.dashboardsOnlyRolesDeprecation', {
          defaultMessage: 'This setting is deprecated and will be removed in Kibana 8.0.',
        }),
        docLinksKey: 'dashboardSettings',
      },
      schema: schema.arrayOf(schema.string()),
    },
  };
}
