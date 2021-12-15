/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INVALID_LICENSE = i18n.translate(
  'xpack.apm.settings.customLink.license.text',
  {
    defaultMessage:
      "To create custom links, you must be subscribed to an Elastic Gold license or above. With it, you'll have the ability to create custom links to improve your workflow when analyzing your services.",
  }
);

export const NO_PERMISSION_LABEL = i18n.translate(
  'xpack.apm.settings.customLink.noPermissionTooltipLabel',
  {
    defaultMessage:
      "Your user role doesn't have permissions to create custom links",
  }
);
