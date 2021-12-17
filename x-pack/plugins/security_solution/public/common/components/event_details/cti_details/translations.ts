/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FEED_NAME_PREPOSITION = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.feedNamePreposition',
  {
    defaultMessage: 'from',
  }
);

export const INDICATOR_ENRICHMENT_TITLE = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.indicatorEnrichmentTitle',
  {
    defaultMessage: 'Threat Match Detected',
  }
);

export const INVESTIGATION_ENRICHMENT_TITLE = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.investigationEnrichmentTitle',
  {
    defaultMessage: 'Enriched with Threat Intelligence',
  }
);

export const HOST_RISK_DATA_TITLE = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.hostRiskDataTitle',
  {
    defaultMessage: 'Host Risk Data',
  }
);

export const INDICATOR_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.indicatorEnrichmentTooltipContent',
  {
    defaultMessage:
      'This field value matched a threat intelligence indicator with a rule you created.',
  }
);

export const INFORMATION_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.informationAriaLabel',
  {
    defaultMessage: 'Information',
  }
);

export const INVESTIGATION_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.eventDetails.ctiSummary.investigationEnrichmentTooltipContent',
  {
    defaultMessage:
      'This field value has additional information available from threat intelligence sources.',
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
    defaultMessage:
      "We haven't found field value has additional information available from threat intelligence sources we searched in the past 30 days by default.",
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

export const NO_HOST_RISK_DATA_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.alertDetails.noRiskDataDescription',
  {
    defaultMessage: 'These is no host risk data found for this alert',
  }
);

export const CHECK_DOCS = i18n.translate('xpack.securitySolution.alertDetails.checkDocs', {
  defaultMessage: 'please check out our documentation',
});

export const INVESTIGATION_QUERY_TITLE = i18n.translate(
  'xpack.securitySolution.alertDetails.investigationTimeQueryTitle',
  {
    defaultMessage: 'Enrichment with Threat Intelligence',
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

export const REFRESH = i18n.translate('xpack.securitySolution.alertDetails.refresh', {
  defaultMessage: 'Refresh',
});

export const ENRICHED_DATA = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.enrichedDataTitle',
  {
    defaultMessage: 'Enriched data',
  }
);
