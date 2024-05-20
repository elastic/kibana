/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from '@kbn/core/server';
import { enableInfrastructureAssetCustomDashboards } from '@kbn/observability-plugin/common';

export async function checkCustomDashboardsEnabled(uiSettingsClient: IUiSettingsClient) {
  const isEnabled = await uiSettingsClient.get(enableInfrastructureAssetCustomDashboards);

  if (!isEnabled) {
    throw Boom.forbidden(
      i18n.translate('xpack.infra.routes.customDashboards', {
        defaultMessage: 'Custom dashboards are not enabled',
      })
    );
  }
}
