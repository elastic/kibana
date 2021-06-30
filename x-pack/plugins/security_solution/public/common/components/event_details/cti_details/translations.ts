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

export const NO_INDICATOR_ENRICHMENTS_FOUND = i18n.translate(
  'xpack.securitySolution.alertDetails.noIndicatorEnrichmentsFound',
  {
    defaultMessage: 'No indicator match rule enrichments found',
  }
);

export const NO_INVESTIGATION_ENRICHMENTS_FOUND = i18n.translate(
  'xpack.securitySolution.alertDetails.noInvestigationEnrichmentsFound',
  {
    defaultMessage: 'No investigation time enrichments found',
  }
);

export const NO_INVESTIGATION_ENRICHMENTS_EXPLANATION = i18n.translate(
  'xpack.securitySolution.alertDetails.noInvestigationEnrichmentsFound',
  {
    defaultMessage:
      "We haven't found any indicator matches from the last 30 days. If you would like to include older indicators, you can ",
  }
);

export const CHANGE_ENRICHMENT_LOOKBACK = i18n.translate(
  'xpack.securitySolution.alertDetails.changeEnrichmentQueryLookback',
  {
    defaultMessage: 'search a different time range',
  }
);

export const ENRICHMENT_LOOKBACK_START_DATE = i18n.translate(
  'xpack.securitySolution.alertDetails.enrichmentQueryStartDate',
  {
    defaultMessage: 'Start date',
  }
);

export const ENRICHMENT_LOOKBACK_END_DATE = i18n.translate(
  'xpack.securitySolution.alertDetails.enrichmentQueryEndDate',
  {
    defaultMessage: 'End date',
  }
);

export const IF_CTI_NOT_ENABLED = i18n.translate(
  'xpack.securitySolution.alertDetails.ifCtiNotEnabled',
  {
    defaultMessage:
      "If you haven't enabled any threat intelligence sources and want to learn more about this capability, ",
  }
);

export const CHECK_DOCS = i18n.translate('xpack.securitySolution.alertDetails.checkDocs', {
  defaultMessage: 'please check out our documentation.',
});

export const INVESTIGATION_QUERY_TITLE = i18n.translate(
  'xpack.securitySolution.alertDetails.investigationTimeQueryTitle',
  {
    defaultMessage: 'Investigation time enrichment',
  }
);
