/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PROVIDER_PREPOSITION = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.providerPreposition',
  {
    defaultMessage: 'from',
  }
);

export const INDICATOR_TOOLTIP_TITLE = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.indicatorEnrichmentTooltipTitle',
  {
    defaultMessage: 'Indicator rule enrichment',
  }
);

export const INVESTIGATION_TOOLTIP_TITLE = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.investigationEnrichmentTooltipTitle',
  {
    defaultMessage: 'Investigation time enrichment',
  }
);

export const INDICATOR_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.indicatorEnrichmentTooltipContent',
  {
    defaultMessage:
      'This field matched a known indicator, and was enriched by an indicator match rule. See more details on the Threat Intel tab.',
  }
);

export const INVESTIGATION_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.investigationEnrichmentTooltipContent',
  {
    defaultMessage:
      'This field matched a known indicator; see more details on the Threat Intel tab.',
  }
);
