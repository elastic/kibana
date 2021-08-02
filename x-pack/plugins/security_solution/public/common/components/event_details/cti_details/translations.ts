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
    defaultMessage: 'Threat Match Detected',
  }
);

export const INVESTIGATION_TOOLTIP_TITLE = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.investigationEnrichmentTooltipTitle',
  {
    defaultMessage: 'Enriched with Threat Intelligence',
  }
);

export const INDICATOR_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.indicatorEnrichmentTooltipContent',
  {
    defaultMessage:
      'This field value matched a threat intelligence indicator with a rule you created.',
  }
);

export const INVESTIGATION_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.investigationEnrichmentTooltipContent',
  {
    defaultMessage:
      'This field value has additional information available from threat intelligence sources.',
  }
);

export const NO_INDICATOR_ENRICHMENTS_TITLE = i18n.translate(
  'xpack.securitySolution.alertDetails.noIndicatorEnrichmentsTitle',
  {
    defaultMessage: 'No Indicator Matches Found',
  }
);

export const NO_INDICATOR_ENRICHMENTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.alertDetails.noIndicatorEnrichmentsDescription',
  {
    defaultMessage:
      'We did not find any threat intelligence indicators with any of the indicator match rules.',
  }
);

export const NO_INVESTIGATION_ENRICHMENTS_TITLE = i18n.translate(
  'xpack.securitySolution.alertDetails.noInvestigationEnrichmentsTitle',
  {
    defaultMessage: 'No Threat Intelligence Enrichment Found',
  }
);

export const NO_INVESTIGATION_ENRICHMENTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.alertDetails.noInvestigationEnrichmentsDescription',
  {
    defaultMessage: 'We did not find any threat intelligence in last 30 days to enrich this alert.',
  }
);

export const NO_ENRICHMENTS_FOUND_TITLE = i18n.translate(
  'xpack.securitySolution.alertDetails.noEnrichmentsFoundTitle',
  {
    defaultMessage: 'No Indicator Match or Threat Intel Enrichment Found',
  }
);

export const NO_ENRICHMENTS_FOUND_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.alertDetails.noEnrichmentsFoundDescription',
  {
    defaultMessage:
      'We did not find threat intelligence that matches any of the indicator match rules, or any enrichment for this alert.',
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
    defaultMessage: 'Enrichment with Threat Intelligence',
  }
);
