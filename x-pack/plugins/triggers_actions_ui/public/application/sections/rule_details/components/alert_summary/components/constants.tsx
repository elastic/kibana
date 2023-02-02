/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const TOOLTIP_DATE_FORMAT = 'YYYY-MM-DD HH:mm';
export const ALERT_COUNT_FORMAT = '0.[00]a';

const visColors = euiPaletteColorBlind();
export const ALL_ALERT_COLOR = visColors[1];

export const WIDGET_TITLE = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.title"
    defaultMessage="Alert activity"
  />
);

export const ALERTS_LABEL = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.alerts"
    defaultMessage="Alerts"
  />
);

export const ACTIVE_ALERT_LABEL = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.activeNow"
    defaultMessage="Active now"
  />
);
