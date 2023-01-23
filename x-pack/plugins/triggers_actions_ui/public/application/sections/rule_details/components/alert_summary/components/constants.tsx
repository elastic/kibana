/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const ACTIVE_COLOR = '#E7664C';
export const RECOVERED_COLOR = '#54B399';
export const TOOLTIP_DATE_FORMAT = 'YYYY-MM-DD HH:mm';

export const ALL_ALERT_LABEL = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.title"
    defaultMessage="Alerts"
  />
);

export const ACTIVE_ALERT_LABEL = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.activeLabel"
    defaultMessage="Active"
  />
);

export const RECOVERED_ALERT_LABEL = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.recoveredLabel"
    defaultMessage="Recovered"
  />
);
