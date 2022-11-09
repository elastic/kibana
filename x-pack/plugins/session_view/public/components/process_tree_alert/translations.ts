/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const ALERT_TYPE_TOOLTIP = (alertDetailTextTooltipContent: string) =>
  i18n.translate('xpack.sessionView.alertTypeTooltip', {
    values: { alertDetailTextTooltipContent },
    defaultMessage: '{alertDetailTextTooltipContent}',
  });
